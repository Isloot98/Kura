import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Button,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import debounce from "lodash.debounce";
import { FlatList, ActivityIndicator } from "react-native";
import { searchProducts } from "../lib/openFoodFacts.js"; 
import { useRoute } from "@react-navigation/native";


const AddItem = () => {
  const navigation = useNavigation();
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
  const route = useRoute();


  const onChange = (event, selectedDate) => {
    if (event.type === "set" && selectedDate) {
      setExpiryDate(selectedDate);
    }
    setShowDatePicker(false); 
  };

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

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("pantry_categories")
        .select("*");
      if (error) {
        console.error("Failed to fetch categories:", error);
      } else {
        setCategories(data);
        if (data.length > 0) setSelectedCategoryId(data[0].id); 
      }
    };

    fetchCategories();
  }, []);

  const debouncedSearch = debounce(async (text) => {
    console.log("Searching for:", text);

    if (text.length < 3) {
      console.log("Search text too short, skipping search.");
      setSearchResults([]);
      return;
    }

    setLoadingSuggestions(true);

    try {
      const results = await searchProducts(text);
      console.log("Search results:", results); 
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, 600);

  useEffect(() => {
    if (suppressSearch) {
      setSuppressSearch(false); 
      return;
    }
    debouncedSearch(name);
    return () => debouncedSearch.cancel();
  }, [name]);

  const handleSuggestionPress = (product) => {
    setSuppressSearch(true); 
    setName(product.name || "");
    setQuantity(product.quantity || "");
    setSearchResults([]); 
  };

 useEffect(() => {
  if (!route.params?.scannedItem) return;

  const scannedItem = route.params.scannedItem;

  setName(scannedItem.name || "");

  setQuantity(
    scannedItem.quantity ? scannedItem.quantity.replace(/[^\d.]/g, "") : ""
  );

  if (scannedItem.unit) setUnit(scannedItem.unit);

  if (scannedItem.mappedCategoryId) setSelectedCategoryId(scannedItem.mappedCategoryId);

  setSuppressSearch(true);
  setSearchResults([]);

  navigation.setParams({ scannedItem: null });
}, [route.params?.scannedItem]);


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Pantry Item</Text>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("BarcodeScanner", { from: "AddItem" })
        }
        style={{
          backgroundColor: "#4caf50",
          padding: 12,
          borderRadius: 8,
          marginBottom: 15,
        }}
      >
        <Text
          style={{ color: "white", textAlign: "center", fontWeight: "bold" }}
        >
          Scan Barcode
        </Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Name (e.g. Apples)"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      {loadingSuggestions && <ActivityIndicator size="small" color="#888" />}

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSuggestionPress(item)}
              style={styles.suggestionItem}
            >
              <Text>{item.name}</Text>
              {item.brand && (
                <Text style={styles.suggestionBrand}>{item.brand}</Text>
              )}
            </TouchableOpacity>
          )}
          style={styles.suggestionsList}
        />
      )}

      <Text style={styles.label}>Category</Text>
      <Picker
        selectedValue={selectedCategoryId}
        onValueChange={(itemValue) => setSelectedCategoryId(itemValue)}
        style={styles.picker}
      >
        {categories.map((cat) => (
          <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
        ))}
      </Picker>
      <Picker
        selectedValue={unit}
        onValueChange={(itemValue) => setUnit(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Grams (g)" value="g" />
        <Picker.Item label="Milliliters (ml)" value="ml" />
        <Picker.Item label="Pieces (pcs)" value="pcs" />
        <Picker.Item label="Liters (l)" value="l" />
        <Picker.Item label="Kilograms (kg)" value="kg" />
      </Picker>

      <TextInput
        placeholder="Quantity (e.g. 500)"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        style={styles.input}
      />
      <Text>Expiry Date: {expiryDate.toDateString()}</Text>
      <Button title="Pick a Date" onPress={() => setShowDatePicker(true)} />

      {showDatePicker && (
        <DateTimePicker
          value={expiryDate}
          mode="date"
          display="default"
          onChange={onChange}
        />
      )}

      <Button title="Submit" onPress={handleAddItem} />

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text style={{ color: "#888" }}>Cancel</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 10, color: "#888", alignSelf: "center" }}>
        Powered by OpenFoodFacts
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    alignSelf: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  picker: {
    marginBottom: 15,
  },
  backButton: {
    marginTop: 20,
    alignItems: "center",
  },
  label: {
    fontWeight: "bold",
    marginBottom: 5,
  },
  suggestionsList: {
    maxHeight: 150,
    backgroundColor: "#f9f9f9",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
  },
  suggestionItem: {
    padding: 10,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  suggestionBrand: {
    color: "#888",
    fontSize: 12,
  },
});

export default AddItem;
