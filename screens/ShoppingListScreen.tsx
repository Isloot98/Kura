// screens/ShoppingListScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  RootStackParamList,
  ShoppingList,
  ShoppingListItem,
} from "../lib/navigationTypes";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type ShoppingListScreenNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ShoppingList"
>;

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const ShoppingListScreen = () => {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const navigation = useNavigation<ShoppingListScreenNavProp>();

  const fetchLists = async () => {
    const { data, error } = await supabase
      .from("shopping_lists")
      .select(
        `
  *,
  shopping_list_items (
    id,
    name,
    quantity,
    unit,
    is_checked,
    category_id,
    pantry_categories (
      name
    )
  )
`
      )

      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setLists(data);
  };

  useFocusEffect(
    useCallback(() => {
      fetchLists();
    }, [])
  );

  const handleDeleteList = async (id: string) => {
    const { error } = await supabase
      .from("shopping_lists")
      .delete()
      .eq("id", id);
    if (error) console.error("Delete list error:", error);
    else fetchLists();
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", id);
    if (error) console.error("Delete item error:", error);
    else fetchLists();
  };

  const handleAddToPantry = async (list: ShoppingList) => {
    if (!list.shopping_list_items?.length) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error(userError);
      return;
    }

    const pantryItems = list.shopping_list_items.map((item) => ({
      name: item.name,
      quantity: item.quantity || null,
      unit: item.unit || null,
      category_id: item.category_id || null,
      user_id: user.id,
      added_from_list_id: list.id, // Optional if you want traceability
      created_at: new Date().toISOString(), // Optional
    }));

    const { error } = await supabase.from("pantry_items").insert(pantryItems);

    if (error) {
      console.error("Error adding to pantry:", error);
    } else {
      console.log("Items added to pantry");
      // Optional: toast/snackbar/alert here
    }
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExpanded = expandedIds.includes(item.id);
    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => toggleExpand(item.id)}
          style={styles.cardHeader}
        >
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            {item.shopping_list_items?.length ? (
              item.shopping_list_items.map((subItem: ShoppingListItem) => (
                <Text key={subItem.id}>
                  • {subItem.name}{" "}
                  {subItem.quantity
                    ? `(${subItem.quantity} ${subItem.unit || ""})`
                    : ""}
                  <TouchableOpacity
                    onPress={() => handleDeleteItem(subItem.id)}
                  >
                    <Text style={{ color: "red" }}>Delete</Text>
                  </TouchableOpacity>
                </Text>
              ))
            ) : (
              <Text style={{ fontStyle: "italic" }}>No items yet</Text>
            )}
            <View style={styles.cardButtons}>
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() =>
                  navigation.navigate("EditShoppingList", { list: item })
                }
              >
                <Text>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() => handleDeleteList(item.id)}
              >
                <Text>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() => handleAddToPantry(item)}
              >
                <Text>Add to Pantry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddShoppingList")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfdfd",
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cardContent: {
    marginTop: 12,
  },
  cardButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  cardButton: {
    padding: 6,
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#2196F3",
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});

export default ShoppingListScreen;
