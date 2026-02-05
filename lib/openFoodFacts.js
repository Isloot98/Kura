const BASE_URL = "https://uk.openfoodfacts.org";

export const searchProducts = async (query) => {
  const url = `https://uk.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&search_simple=1&action=process&json=1&page_size=10`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many requests. Please try again shortly.");
      }
      throw new Error(`Search failed with status ${response.status}`);
    }

    const data = await response.json();

    return data.products.map((product) => ({
      name: product.product_name,
      brand: product.brands,
      image: product.image_url,
      quantity: product.quantity,
      nutriments: product.nutriments,
      categories: product.categories_tags,
      lang: product.lang,
    }));
  } catch (error) {
    console.error("Open Food Facts search error:", error);
    throw error;
  }
};
export async function fetchProductFromBarcode(barcode) {
  try {
    const res = await fetch(
      `https://uk.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    const json = await res.json();

    if (json.status === 1 && json.product) {
      const product = json.product;

      const categoryTags = Array.isArray(product.categories_tags)
        ? product.categories_tags
        : [];

      // Prefer a meaningful specific tag for mapping
      // 1) if "en:eggs" exists, use it
      // 2) else use the last tag (often most specific)
      const bestCategoryTag =
        categoryTags.find((t) => t === "en:eggs") ||
        (categoryTags.length ? categoryTags[categoryTags.length - 1] : null);

      return {
        name: product.product_name || "",
        quantity: product.quantity || "",
        brand: product.brands || "",

        categoryLabel: product.categories?.split(",")[0]?.trim() || "",

        categoryTag: bestCategoryTag,     
        categoryTags: categoryTags,       
      };
    }

    return null;
  } catch (err) {
    console.error("Barcode fetch error:", err);
    return null;
  }
}
