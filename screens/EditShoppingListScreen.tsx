import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useRoute, useNavigation } from "@react-navigation/native";

type ShoppingListItem = {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category_id?: string | null;
  isNew?: boolean;
};

type PantryCategory = {
  id: string;
  name: string;
};

const EditShoppingListScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();

  // Expect the whole list object passed in params, including existing items
  const { list } = route.params as {
    list: {
      id: string;
      name: string;
      shopping_list_items?: Array<{
        id: string;
        name: string;
        quantity?: number;
        unit?: string;
        category_id?: string | null;
        isNew?: boolean;
      }>;
    };
  };

  const [listName, setListName] = useState(list.name);
  const [items, setItems] = useState<ShoppingListItem[]>(
    list.shopping_list_items?.map((item) => ({
      ...item,
    })) || []
  );

  // Inputs for new item entry
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [categories, setCategories] = useState<PantryCategory[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  useEffect(() => {
    // Load categories
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("pantry_categories").select();
      if (error) {
        console.error(error);
      } else {
        setCategories(data || []);
      }
    };
    fetchCategories();
  }, []);

  // Add a new item to the list state
  const addItem = () => {
    if (!itemName.trim()) return;

    setItems([
      ...items,
      {
        id: `temp-${Math.random()}`, // temp id for new items not yet in DB
        name: itemName.trim(),
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit: unit || undefined,
        category_id: selectedCategoryId,
        isNew: true, // mark new items so we can insert only them
      },
    ]);

    setItemName("");
    setQuantity("");
    setUnit("");
    setSelectedCategoryId(null);
  };

  // Delete an item from state by id
  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Save updated list and items
  const saveList = async () => {
    if (!listName.trim()) {
      Alert.alert("Validation", "Please enter a list name.");
      return;
    }

    try {
      // Update list name first
      const { error: listError } = await supabase
        .from("shopping_lists")
        .update({ name: listName.trim() })
        .eq("id", list.id);

      if (listError) throw listError;

      // Handle items:
      // 1. Determine which existing items were deleted (by comparing original vs current)
      // 2. Delete those items from DB
      // 3. Insert new items marked as isNew
      // 4. (Optional) Update edited items (if you allow editing existing item fields)

      // IDs of original items in DB
      const originalItemIds = list.shopping_list_items?.map((i) => i.id) || [];

      // IDs of current items
      const currentItemIds = items.filter((i) => !i.isNew).map((i) => i.id);

      // Items removed by user (deleted)
      const deletedItemIds = originalItemIds.filter(
        (id) => !currentItemIds.includes(id)
      );

      // Delete removed items from DB
      if (deletedItemIds.length > 0) {
        const { error: delError } = await supabase
          .from("shopping_list_items")
          .delete()
          .in("id", deletedItemIds);
        if (delError) throw delError;
      }

      // Insert new items only
      const newItems = items.filter((i) => i.isNew);

      if (newItems.length > 0) {
        // Prepare items to insert with the shopping_list_id
        const itemsToInsert = newItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category_id: item.category_id,
          shopping_list_id: list.id,
          is_checked: false, // default false on new items
        }));

        const { error: insertError } = await supabase
          .from("shopping_list_items")
          .insert(itemsToInsert);
        if (insertError) throw insertError;
      }

      // For simplicity, no updates of existing items here; you could add if needed

      Alert.alert("Success", "Shopping list updated.");
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update the shopping list.");
    }
  };

  return (
    <View style={styles.container}>
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
        keyExtractor={(item) => item.id.toString()}
        style={{ marginTop: 10 }}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginVertical: 4,
            }}
          >
            <Text>
              {item.name} - {item.quantity || "-"} {item.unit || ""}
            </Text>
            <TouchableOpacity
              onPress={() => deleteItem(item.id)}
              style={{
                backgroundColor: "red",
                paddingHorizontal: 8,
                borderRadius: 4,
              }}
            >
              <Text style={{ color: "white" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Button title="Save Shopping List" onPress={saveList} />
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

export default EditShoppingListScreen;
