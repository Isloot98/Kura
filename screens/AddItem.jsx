import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import debounce from "lodash.debounce";
import { searchProducts } from "../lib/openFoodFacts.js";

const AddItem = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [searchResults, setSearchResults] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suppressSearch, setSuppressSearch] = useState(false);

  // -------------------------
  // Save
  // -------------------------
  const handleAddItem = async () => {
    if (!name || !unit || !quantity) {
      Alert.alert("Please fill in all fields");
      return;
    }

    const { data, error } = await supabase.from("pantry_items").insert([
      {
        name,
        unit,
        quantity: Number(quantity),
        expiry_date: expiryDate.toISOString(),
        category_id: selectedCategoryId,
      },
    ]);

    if (error) {
      console.error("Insert error:", error);
      Alert.alert("Error adding item", error.message);
    } else {
      console.log("Item added:", data);
      navigation.navigate("Home");
    }
  };

  // -------------------------
  // Date picker
  // -------------------------
  const onChange = (event, selectedDate) => {
    if (event.type === "set" && selectedDate) setExpiryDate(selectedDate);
    setShowDatePicker(false);
  };

  // -------------------------
  // Categories
  // -------------------------
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("pantry_categories").select("*");
      if (error) {
        console.error("Failed to fetch categories:", error);
      } else {
        setCategories(data || []);
        if ((data || []).length > 0) setSelectedCategoryId(data[0].id);
      }
    };

    fetchCategories();
  }, []);

  // -------------------------
  // OFF suggestions
  // -------------------------
  const debouncedSearch = useMemo(
    () =>
      debounce(async (text) => {
        if (text.length < 3) {
          setSearchResults([]);
          return;
        }

        setLoadingSuggestions(true);
        try {
          const results = await searchProducts(text);
          setSearchResults(results);
        } catch (err) {
          console.error("Search failed:", err);
        } finally {
          setLoadingSuggestions(false);
        }
      }, 600),
    []
  );

  useEffect(() => {
    if (suppressSearch) {
      setSuppressSearch(false);
      return;
    }
    debouncedSearch(name);
    return () => debouncedSearch.cancel();
  }, [name, debouncedSearch, suppressSearch]);

  const handleSuggestionPress = (product) => {
    setSuppressSearch(true);
    setName(product.name || "");
    setQuantity(product.quantity || "");
    setSearchResults([]);
  };

  // -------------------------
  // Prefill from scanner
  // -------------------------
  useEffect(() => {
    if (!route.params?.scannedItem) return;

    const scannedItem = route.params.scannedItem;

    setSuppressSearch(true);
    setSearchResults([]);

    setName(scannedItem.name || "");
    setQuantity(scannedItem.quantity ? scannedItem.quantity.replace(/[^\d.]/g, "") : "");
    if (scannedItem.unit) setUnit(scannedItem.unit);
    if (scannedItem.mappedCategoryId) setSelectedCategoryId(scannedItem.mappedCategoryId);

    navigation.setParams({ scannedItem: null });
  }, [route.params?.scannedItem, navigation]);

  // -------------------------
  // UI
  // -------------------------
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header text is already "AddItem" in your nav, so keep this subtle */}
          <Text style={styles.header}>Add Pantry Item</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("BarcodeScanner", { from: "AddItem" })}
            style={styles.scanButton}
            activeOpacity={0.85}
          >
            <Text style={styles.scanButtonText}>Scan Barcode</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Name</Text>
          <TextInput
            placeholder="e.g. Apples"
            placeholderTextColor="#9AA0A6"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          {/* Suggestions */}
          {loadingSuggestions && (
            <View style={styles.suggestLoading}>
              <ActivityIndicator size="small" />
              <Text style={styles.suggestLoadingText}>Searching…</Text>
            </View>
          )}

          {searchResults.length > 0 && (
            <View style={styles.suggestionsShell}>
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => index.toString()}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSuggestionPress(item)}
                    style={styles.suggestionItem}
                  >
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    {!!item.brand && <Text style={styles.suggestionBrand}>{item.brand}</Text>}
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={selectedCategoryId}
              onValueChange={(v) => setSelectedCategoryId(v)}
              style={styles.picker}
              dropdownIconColor="#111"
            >
              {categories.map((cat) => (
                <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Unit</Text>
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={unit}
              onValueChange={(v) => setUnit(v)}
              style={styles.picker}
              dropdownIconColor="#111"
            >
              <Picker.Item label="Grams (g)" value="g" />
              <Picker.Item label="Milliliters (ml)" value="ml" />
              <Picker.Item label="Pieces (pcs)" value="pcs" />
              <Picker.Item label="Liters (l)" value="l" />
              <Picker.Item label="Kilograms (kg)" value="kg" />
            </Picker>
          </View>

          <Text style={styles.label}>Quantity</Text>
          <TextInput
            placeholder="e.g. 500"
            placeholderTextColor="#9AA0A6"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            style={styles.input}
          />

          <View style={styles.row}>
            <Text style={styles.metaText}>Expiry: {expiryDate.toDateString()}</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.secondaryButton}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>Pick date</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={expiryDate}
              mode="date"
              display="default"
              onChange={onChange}
            />
          )}

          <TouchableOpacity
            onPress={handleAddItem}
            style={styles.primaryButton}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Submit</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>Powered by OpenFoodFacts</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  container: {
    padding: 20,
    paddingTop: 14,
    gap: 10,
  },

  header: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginBottom: 4,
  },

  label: {
    fontWeight: "800",
    color: "#111",
    marginTop: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
  },

  scanButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 6,
  },
  scanButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  pickerShell: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  picker: {
    height: 52,
    color: "#111",
  },

  suggestionsShell: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    maxHeight: 180,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionName: { fontSize: 15, color: "#111", fontWeight: "700" },
  suggestionBrand: { color: "#6B7280", fontSize: 12, marginTop: 2 },

  suggestLoading: { flexDirection: "row", alignItems: "center", gap: 8 },
  suggestLoadingText: { color: "#6B7280", fontWeight: "700" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metaText: { color: "#374151", fontSize: 14, fontWeight: "700" },

  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  secondaryButtonText: { color: "#111", fontWeight: "900" },

  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  cancelButton: { alignItems: "center", paddingVertical: 10 },
  cancelText: { color: "#6B7280", fontWeight: "800" },

  footer: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
  },
});

export default AddItem;
