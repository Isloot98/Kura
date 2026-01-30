const BASE_URL = "https://uk.openfoodfacts.org";

// lib/openFoodFacts.js
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
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    const json = await res.json();

    if (json.status === 1 && json.product) {
      const product = json.product;
      return {
        name: product.product_name || "",
        quantity: product.quantity || "",
        brand: product.brands || "",
        category: product.categories?.split(",")[0]?.trim() || "",
      };
    } else {
      return null;
    }
  } catch (err) {
    console.error("Barcode fetch error:", err);
    return null;
  }
}
