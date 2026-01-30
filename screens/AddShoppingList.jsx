// screens/AddShoppingListScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { supabase } from "../lib/supabase";
import { searchProducts } from "../lib/openFoodFacts";

const testOFF = async () => {
  const results = await searchProducts("chicken");
  console.log("OFF results:", results);
};
const AddShoppingListScreen = ({ navigation }) => {
  const [listName, setListName] = useState("");
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("pantry_categories").select();
      if (error) console.error(error);
      else setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const addItem = () => {
    if (!itemName.trim()) return;

    setItems([
      ...items,
      {
        name: itemName.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        category_id: selectedCategoryId,
      },
    ]);

    setItemName("");
    setQuantity("");
    setUnit("");
    setSelectedCategoryId(null);
  };

  const createList = async () => {
    if (!listName.trim()) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error(userError);
      return;
    }

    const { data: listData, error: listError } = await supabase
      .from("shopping_lists")
      .insert({ name: listName.trim(), user_id: user.id })
      .select()
      .single();

    if (listError || !listData) {
      console.error(listError);
      return;
    }

    const itemsToInsert = items.map((item) => ({
      ...item,
      shopping_list_id: listData.id,
    }));

    const { error: itemsError } = await supabase
      .from("shopping_list_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error(itemsError);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Test OFF" onPress={testOFF} />

      <Text style={styles.label}>List Name</Text>
      <TextInput
        value={listName}
        onChangeText={setListName}
        placeholder="e.g. Weekly Shop"
        style={styles.input}
      />

      <Text style={styles.label}>Add Item</Text>
      <TextInput
        value={itemName}
        onChangeText={setItemName}
        placeholder="Item name"
        style={styles.input}
      />
      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        placeholder="Quantity (optional)"
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        value={unit}
        onChangeText={setUnit}
        placeholder="Unit (e.g. kg, ml)"
        style={styles.input}
      />
      {/* Simplified category selector */}
      <FlatList
        data={categories}
        horizontal
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedCategoryId(item.id)}
            style={[
              styles.category,
              item.id === selectedCategoryId && styles.categorySelected,
            ]}
          >
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <Button title="Add Item" onPress={addItem} />

      <FlatList
        data={items}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Text>
            {item.name} - {item.quantity || "-"} {item.unit || ""}
          </Text>
        )}
        style={{ marginTop: 10 }}
      />

      <Button title="Create Shopping List" onPress={createList} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 16, fontWeight: "bold", marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  category: {
    padding: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 6,
  },
  categorySelected: {
    backgroundColor: "#cce5ff",
    borderColor: "#007bff",
  },
});

export default AddShoppingListScreen;
