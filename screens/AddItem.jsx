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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import debounce from "lodash.debounce";
import { searchProducts } from "../lib/openFoodFacts.js";
import { Ionicons } from "@expo/vector-icons";

import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

const PressableScale = ({ children, onPress, style }) => {
  const [pressed, setPressed] = useState(false);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed ? 0.98 : 1, { duration: 120 }) }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={style}
    >
      <Animated.View style={aStyle}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

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

  const onChange = (event, selectedDate) => {
    if (event?.type === "set" && selectedDate) setExpiryDate(selectedDate);
    setShowDatePicker(false);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("pantry_categories")
        .select("*");

      if (error) {
        console.error("Failed to fetch categories:", error);
      } else {
        setCategories(data || []);
        if ((data || []).length > 0) setSelectedCategoryId((data || [])[0].id);
      }
    };

    fetchCategories();
  }, []);

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
          setSearchResults(results || []);
        } catch (err) {
          console.error("Search failed:", err);
        } finally {
          setLoadingSuggestions(false);
        }
      }, 600),
    [],
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

  useEffect(() => {
    if (!route.params?.scannedItem) return;

    const scannedItem = route.params.scannedItem;

    setSuppressSearch(true);
    setSearchResults([]);

    setName(scannedItem.name || "");
    setQuantity(
      scannedItem.quantity ? scannedItem.quantity.replace(/[^\d.]/g, "") : "",
    );
    if (scannedItem.unit) setUnit(scannedItem.unit);
    if (scannedItem.mappedCategoryId)
      setSelectedCategoryId(scannedItem.mappedCategoryId);

    navigation.setParams({ scannedItem: null });
  }, [route.params?.scannedItem, navigation]);

  const hasSuggestions = searchResults.length > 0;

  const Header = (
    <View style={{ gap: 12 }}>
      <PressableScale
        onPress={() =>
          navigation.navigate("BarcodeScanner", { from: "AddItem" })
        }
        style={styles.scanWrap}
      >
        <View style={styles.scanButton}>
          <Ionicons name="barcode-outline" size={18} color="#fff" />
          <Text style={styles.scanButtonText}>Scan Barcode</Text>
        </View>
      </PressableScale>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>

        <View style={styles.inputWithIcon}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="e.g. Apples"
            placeholderTextColor="#9AA0A6"
            value={name}
            onChangeText={setName}
            style={styles.input}
            returnKeyType="done"
          />
          {!!name && (
            <TouchableOpacity
              onPress={() => setName("")}
              style={styles.clearBtn}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {loadingSuggestions && (
          <View style={styles.suggestLoading}>
            <ActivityIndicator size="small" />
            <Text style={styles.suggestLoadingText}>Searching…</Text>
          </View>
        )}

        {hasSuggestions && (
          <Animated.View
            entering={FadeInDown.duration(160)}
            exiting={FadeOut.duration(120)}
            layout={LinearTransition.springify().damping(16)}
            style={{ marginTop: 10 }}
          >
            <Text style={styles.suggestionsTitle}>Suggestions</Text>

            <View style={styles.suggestionsBox}>
              {searchResults.slice(0, 8).map((item, index) => (
                <TouchableOpacity
                  key={`${item.name || "item"}-${index}`}
                  onPress={() => handleSuggestionPress(item)}
                  style={[
                    styles.suggestionRow,
                    index === 7 ? { borderBottomWidth: 0 } : null,
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.suggestionName}>{item.name}</Text>
                  {!!item.brand && (
                    <Text style={styles.suggestionBrand}>{item.brand}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}
      </View>

      <View style={styles.card}>
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

        <Text style={[styles.label, { marginTop: 12 }]}>Unit</Text>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Quantity</Text>
        <TextInput
          placeholder="e.g. 500"
          placeholderTextColor="#9AA0A6"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          style={styles.qtyInput}
          returnKeyType="done"
        />

        <View style={styles.row}>
          <Text style={styles.metaText}>
            Expiry: {expiryDate.toDateString()}
          </Text>
          <PressableScale onPress={() => setShowDatePicker(true)}>
            <View style={styles.secondaryButton}>
              <Ionicons name="calendar-outline" size={16} color="#111" />
              <Text style={styles.secondaryButtonText}>Pick date</Text>
            </View>
          </PressableScale>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={expiryDate}
            mode="date"
            display="default"
            onChange={onChange}
          />
        )}
      </View>

      <PressableScale onPress={handleAddItem}>
        <View style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Submit</Text>
        </View>
      </PressableScale>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.cancelButton}
        activeOpacity={0.85}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Powered by OpenFoodFacts</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={Header}
          keyExtractor={() => "x"}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },

  container: {
    padding: 16,
    paddingBottom: 28,
  },

  header: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },

  label: {
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
    fontSize: 13,
    letterSpacing: 0.2,
  },

  scanWrap: { marginBottom: 2 },
  scanButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  scanButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 0,
  },
  clearBtn: { paddingLeft: 4 },

  qtyInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },

  pickerShell: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  picker: {
    height: 52,
    color: "#111827",
  },

  suggestLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  suggestLoadingText: { color: "#6B7280", fontWeight: "800" },

  suggestionsTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B7280",
    letterSpacing: 0.4,
    marginBottom: 2,
  },

  suggestionsBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  suggestionName: { fontSize: 15, color: "#111827", fontWeight: "800" },
  suggestionBrand: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "700",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  metaText: { color: "#374151", fontSize: 13, fontWeight: "800" },

  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  secondaryButtonText: { color: "#111827", fontWeight: "900" },

  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  cancelButton: { alignItems: "center", paddingVertical: 10 },
  cancelText: { color: "#6B7280", fontWeight: "900" },

  footer: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    fontWeight: "700",
  },
});

export default AddItem;
