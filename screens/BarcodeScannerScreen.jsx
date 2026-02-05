import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";
import { runOnJS } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";

import { fetchProductFromBarcode } from "../lib/openFoodFacts";
import { supabase } from "../lib/supabase";

const normalizeSimple = (s = "") =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isAmbiguousFoodAndBeverageLabel = (label = "") => {
  const l = normalizeSimple(label);
  const hasFood = l.includes("food");
  const hasBeverage = l.includes("beverage");
  const hasAnd = l.includes(" and ");
  return hasAnd && hasFood && hasBeverage;
};

function parseQtyUnit(quantityStr) {
  if (!quantityStr) return { quantity: "", unit: "pcs" };

  const s = quantityStr.toString().trim().toLowerCase();
  const m = s.match(/([\d.,]+)\s*(kg|g|ml|l|pcs|pc|piece|pieces)?/i);

  if (!m) return { quantity: "", unit: "pcs" };

  const qty = (m[1] || "").replace(/,/g, "");
  let unit = (m[2] || "pcs").toLowerCase();

  if (unit === "pc" || unit === "piece" || unit === "pieces") unit = "pcs";
  if (!["kg", "g", "ml", "l", "pcs"].includes(unit)) unit = "pcs";

  return { quantity: qty, unit };
}

export default function BarcodeScannerScreen() {
  const navigation = useNavigation();
  const device = useCameraDevice("back");
  const { hasPermission } = useCameraPermission();

  const [scanned, setScanned] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [mappedCategoryId, setMappedCategoryId] = useState(null);

  useEffect(() => {
    const loadCats = async () => {
      const { data, error } = await supabase
        .from("pantry_categories")
        .select("*");

      if (error) {
        console.error("Failed to fetch categories:", error);
        return;
      }
      setCategories(data || []);
    };

    loadCats();
  }, []);

  useEffect(() => {
    if (!product) return;

    let cancelled = false;

    (async () => {
      const id = await resolveMappedCategoryId(product, categories);
      if (!cancelled) setMappedCategoryId(id);
    })();

    return () => {
      cancelled = true;
    };
  }, [product, categories]);

  const handleBarcode = async (barcode) => {
    if (scanned || loading) return;

    console.log("📸 Scanned barcode:", barcode);
    setScanned(true);
    setLoading(true);

    try {
      const productData = await fetchProductFromBarcode(barcode);
      console.log("📦 Product data received:", productData);

      if (productData) {
        setProduct(productData);
      } else {
        setProduct(null);
        Alert.alert("Not Found", "No product found for this barcode.");
        setScanned(false);
      }
    } catch (error) {
      console.error("❌ Error fetching product:", error);
      Alert.alert("Error", "Something went wrong while fetching product info.");
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  async function resolveMappedCategoryId(product, localCategories) {
    if (!product) return null;

    const keys = [];

    if (product.categoryTag) keys.push(product.categoryTag);

    if (Array.isArray(product.categoryTags) && product.categoryTags.length) {
      const reversed = [...product.categoryTags].reverse();
      for (const t of reversed) keys.push(t);
    }

    if (product.categoryLabel) keys.push(product.categoryLabel);

    const uniqueKeys = [
      ...new Set(keys.map((k) => (k || "").toLowerCase().trim())),
    ].filter(Boolean);

    for (const offKey of uniqueKeys) {
      const { data, error } = await supabase
        .from("category_mappings")
        .select("pantry_category_id")
        .eq("off_key", offKey)
        .maybeSingle();

      if (error) {
        console.error("category_mappings lookup error:", error);
        break;
      }

      if (data?.pantry_category_id) return data.pantry_category_id;
    }

    if (
      product.categoryLabel &&
      isAmbiguousFoodAndBeverageLabel(product.categoryLabel)
    ) {
      return null;
    }

    return null;
  }

  const codeScanner = useCodeScanner({
    codeTypes: ["ean-13", "qr"],
    onCodeScanned: (codes) => {
      const value = codes[0]?.value;
      if (value) runOnJS(handleBarcode)(value);
    },
  });

  const scannedItemForAddItem = useMemo(() => {
    if (!product) return null;

    const { quantity, unit } = parseQtyUnit(product.quantity);

    return {
      name: product.name || "",
      quantity: product.quantity || "",
      parsedQuantity: quantity,
      parsedUnit: unit,
      category: product.categoryLabel || "",
      categoryTag: product.categoryTag || null,
      mappedCategoryId: mappedCategoryId || null,
      brand: product.brand || "",
    };
  }, [product, mappedCategoryId]);

  const handlePrefillAddItem = () => {
    if (!scannedItemForAddItem) return;

    navigation.navigate("AddItem", {
      scannedItem: {
        name: scannedItemForAddItem.name,
        quantity: scannedItemForAddItem.quantity,
        unit: scannedItemForAddItem.parsedUnit,
        category: scannedItemForAddItem.category,
        mappedCategoryId: scannedItemForAddItem.mappedCategoryId,
        brand: scannedItemForAddItem.brand,
      },
    });
  };

  const handleAddToPantry = async () => {
    if (!scannedItemForAddItem) return;

    const { parsedQuantity, parsedUnit } = scannedItemForAddItem;

    if (!scannedItemForAddItem.name) {
      Alert.alert(
        "Missing name",
        "This product doesn't have a name. Use Edit to fill it in.",
      );
      return;
    }

    if (!parsedQuantity) {
      Alert.alert(
        "Missing quantity",
        "Quantity couldn't be parsed. Use Edit to fill it in.",
      );
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("pantry_items").insert([
        {
          name: scannedItemForAddItem.name,
          unit: parsedUnit,
          quantity: Number(parsedQuantity),
          expiry_date: null,
          category_id: scannedItemForAddItem.mappedCategoryId,
        },
      ]);

      if (error) throw error;

      Alert.alert("Added ✅", `${scannedItemForAddItem.name} added to pantry`);
      setProduct(null);
      setScanned(false);
    } catch (e) {
      console.error("Add to pantry failed:", e);
      Alert.alert("Error", e?.message || "Failed to add item.");
    } finally {
      setLoading(false);
    }
  };

  const handleScanAgain = () => {
    setProduct(null);
    setScanned(false);
  };

  if (!hasPermission) return <Text>No permission for camera</Text>;
  if (device == null) return <Text>No camera device found</Text>;

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!loading}
        codeScanner={codeScanner}
      />

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Fetching product info...</Text>
        </View>
      )}

      {product && (
        <View style={styles.result}>
          <Text style={styles.productText}>🍽️ Product: {product.name}</Text>
          <Text style={styles.productText}>🏷️ Brand: {product.brand}</Text>
          <Text style={styles.productText}>
            📦 Quantity: {product.quantity}
          </Text>
          <Text style={styles.productText}>
            📂 OFF Label: {product.categoryLabel}
          </Text>
          <Text style={styles.productText}>
            🏷️ OFF Tag: {product.categoryTag}
          </Text>

          <Text style={styles.productText}>
            🔗 Mapped Category:{" "}
            {mappedCategoryId
              ? categories.find((c) => c.id === mappedCategoryId)?.name ||
                "Matched"
              : "No match"}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleAddToPantry}
            >
              <Text style={styles.btnText}>Add to Pantry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handlePrefillAddItem}
            >
              <Text style={styles.btnTextDark}>Edit in AddItem</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.linkBtn} onPress={handleScanAgain}>
            <Text style={styles.linkText}>Scan again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  loadingText: { marginTop: 10, color: "#fff", fontSize: 16 },
  result: {
    position: "absolute",
    bottom: 30,
    left: 10,
    right: 10,
    backgroundColor: "#000000aa",
    padding: 12,
    borderRadius: 10,
  },
  productText: { color: "#fff", fontSize: 15, marginBottom: 4 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#4caf50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "800" },
  btnTextDark: { color: "#111", fontWeight: "800" },
  linkBtn: { marginTop: 10, alignItems: "center" },
  linkText: { color: "#ddd", textDecorationLine: "underline" },
});
