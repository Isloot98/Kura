// screens/RecipeListScreen.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  RootStackParamList,
  Recipe,
  RecipeIngredient,
} from "../lib/navigationTypes";
import { supabase } from "../lib/supabase";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "RecipeListScreen"
>;

const RecipeListScreen = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const navigation = useNavigation<NavigationProp>();

  const fetchRecipes = async () => {
    const { data, error } = await supabase
      .from("recipes")
      .select(
        `
    *,
    recipe_ingredients (
      id,
      name,
      quantity,
      unit,
      category_id
    )
  `
      )
      .order("created_at", { ascending: false });

    if (error) console.error("Fetch error:", error);
    else setRecipes(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, [])
  );

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteRecipe = async (id: string) => {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) console.error("Delete error:", error);
    else fetchRecipes();
  };

  const handleAddToShoppingList = async (recipe: Recipe) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const { data: newList, error } = await supabase
      .from("shopping_lists")
      .insert({ name: `${recipe.title} Ingredients`, user_id: userId })
      .select()
      .single();

    if (error || !newList) return console.error("Create list error:", error);

    const items = recipe.recipe_ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      shopping_list_id: newList.id,
    }));

    const { error: insertError } = await supabase
      .from("shopping_list_items")
      .insert(items);

    if (insertError) console.error("Insert items error:", insertError);
  };

  const renderItem = ({ item }: { item: Recipe }) => {
    const isExpanded = expandedIds.includes(item.id);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => toggleExpand(item.id)}
          style={styles.cardHeader}
        >
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            {item.description && (
              <Text style={{ marginBottom: 8 }}>{item.description}</Text>
            )}

            {item.recipe_ingredients?.length ? (
              item.recipe_ingredients.map((ing: RecipeIngredient) => (
                <Text key={ing.id}>
                  • {ing.name}{" "}
                  {ing.quantity ? `(${ing.quantity} ${ing.unit || ""})` : ""}
                </Text>
              ))
            ) : (
              <Text style={{ fontStyle: "italic" }}>No ingredients listed</Text>
            )}

            <View style={styles.cardButtons}>
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() =>
                  navigation.navigate("EditRecipeScreen", { recipe: item })
                }
              >
                <Text>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() => handleDeleteRecipe(item.id)}
              >
                <Text>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() => handleAddToShoppingList(item)}
              >
                <Text>Add to Shopping List</Text>
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
        data={recipes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddRecipeScreen")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfdfd" },
  list: { padding: 16 },
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  cardTitle: { fontSize: 18, fontWeight: "bold" },
  cardContent: { marginTop: 12 },
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

export default RecipeListScreen;
