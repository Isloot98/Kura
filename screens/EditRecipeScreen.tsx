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

type RecipeIngredient = {
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

const EditRecipeScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();

  const { recipe } = route.params as {
    recipe: {
      id: string;
      title: string;
      recipe_ingredients?: Array<{
        id: string;
        name: string;
        quantity?: number;
        unit?: string;
        category_id?: string | null;
        isNew?: boolean;
      }>;
    };
  };

  const [recipeTitle, setRecipeTitle] = useState(recipe.title);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe.recipe_ingredients?.map((i) => ({ ...i })) || []
  );

  const [ingredientName, setIngredientName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [categories, setCategories] = useState<PantryCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  useEffect(() => {
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

  const addIngredient = () => {
    if (!ingredientName.trim()) return;

    setIngredients([
      ...ingredients,
      {
        id: `temp-${Math.random()}`,
        name: ingredientName.trim(),
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit: unit || undefined,
        category_id: selectedCategoryId,
        isNew: true,
      },
    ]);

    setIngredientName("");
    setQuantity("");
    setUnit("");
    setSelectedCategoryId(null);
  };

  const deleteIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  const saveRecipe = async () => {
    if (!recipeTitle.trim()) {
      Alert.alert("Validation", "Please enter a recipe title.");
      return;
    }

    try {
      // Update recipe title
      const { error: recipeError } = await supabase
        .from("recipes")
        .update({ title: recipeTitle.trim() })
        .eq("id", recipe.id);

      if (recipeError) throw recipeError;

      const originalIds = recipe.recipe_ingredients?.map((i) => i.id) || [];
      const currentIds = ingredients.filter((i) => !i.isNew).map((i) => i.id);
      const deletedIds = originalIds.filter((id) => !currentIds.includes(id));

      if (deletedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("recipe_ingredients")
          .delete()
          .in("id", deletedIds);
        if (deleteError) throw deleteError;
      }

      const newIngredients = ingredients.filter((i) => i.isNew);

      if (newIngredients.length > 0) {
        const toInsert = newIngredients.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category_id: item.category_id,
          recipe_id: recipe.id,
        }));

        const { error: insertError } = await supabase
          .from("recipe_ingredients")
          .insert(toInsert);
        if (insertError) throw insertError;
      }

      Alert.alert("Success", "Recipe updated.");
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update the recipe.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Recipe Title</Text>
      <TextInput
        value={recipeTitle}
        onChangeText={setRecipeTitle}
        placeholder="e.g. Chicken Curry"
        style={styles.input}
      />

      <Text style={styles.label}>Add Ingredient</Text>
      <TextInput
        value={ingredientName}
        onChangeText={setIngredientName}
        placeholder="Ingredient name"
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
        placeholder="Unit (e.g. g, ml)"
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

      <Button title="Add Ingredient" onPress={addIngredient} />

      <FlatList
        data={ingredients}
        keyExtractor={(item) => item.id.toString()}
        style={{ marginTop: 10 }}
        renderItem={({ item }) => (
          <View style={styles.ingredientRow}>
            <Text>
              {item.name} - {item.quantity || "-"} {item.unit || ""}
            </Text>
            <TouchableOpacity
              onPress={() => deleteIngredient(item.id)}
              style={styles.deleteButton}
            >
              <Text style={{ color: "white" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Button title="Save Recipe" onPress={saveRecipe} />
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
  ingredientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  deleteButton: {
    backgroundColor: "red",
    paddingHorizontal: 8,
    borderRadius: 4,
  },
});

export default EditRecipeScreen;
