import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator, Alert } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from "react-native-vision-camera";
import { runOnJS } from "react-native-reanimated";
import { fetchProductFromBarcode } from "../lib/openFoodFacts"; // Adjust path if needed

export default function BarcodeScannerScreen() {
  const device = useCameraDevice("back");
  const { hasPermission } = useCameraPermission();

  const [scanned, setScanned] = useState(false);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

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
        Alert.alert(
          "✅ Product Found",
          `${productData.name || "Unnamed item"} by ${
            productData.brand || "Unknown brand"
          }`
        );
      } else {
        console.warn("⚠️ No product found for barcode:", barcode);
        Alert.alert("Not Found", "No product found for this barcode.");
      }
    } catch (error) {
      console.error("❌ Error fetching product:", error);
      Alert.alert("Error", "Something went wrong while fetching product info.");
    } finally {
      setLoading(false);
    }
  };
  const codeScanner = useCodeScanner({
    codeTypes: ["ean-13", "qr"],
    onCodeScanned: (codes) => {
      console.log("🔍 Codes scanned:", codes);
      const value = codes[0]?.value; // <-- was `data`

      if (value) {
        console.log("📸 Scanned barcode:", value);
        runOnJS(handleBarcode)(value);
      } else {
        console.warn("⚠️ No value in scanned code");
      }
    },
  });

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
            📂 Category: {product.category}
          </Text>
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
  loadingText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 16,
  },
  result: {
    position: "absolute",
    bottom: 40,
    left: 10,
    right: 10,
    backgroundColor: "#000000aa",
    padding: 10,
    borderRadius: 8,
  },
  productText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 4,
  },
});
