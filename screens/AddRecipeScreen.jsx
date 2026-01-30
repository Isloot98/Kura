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

export default function AddRecipeScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    quantity: "",
    unit: "",
    category_id: null,
  });

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("pantry_categories").select();
      if (error) console.error("Category fetch error:", error);
      else setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const addIngredient = () => {
    if (!newIngredient.name.trim()) {
      alert("Please enter an ingredient name.");
      return;
    }
    if (!newIngredient.category_id) {
      alert("Please select a category for the ingredient.");
      return;
    }

    setIngredients([...ingredients, newIngredient]);
    setNewIngredient({
      name: "",
      quantity: "",
      unit: "",
      category_id: null,
    });
  };

  const submitRecipe = async () => {
    if (!title.trim()) return;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User not authenticated");
      return;
    }

    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .insert([{ title, description, user_id: user.id }])
      .select()
      .single();

    if (recipeError) {
      console.error("Error creating recipe:", recipeError.message);
      return;
    }

    const formattedIngredients = ingredients.map((i) => ({
      recipe_id: recipe.id,
      name: i.name,
      quantity: i.quantity || null,
      unit: i.unit || null,
      category_id: i.category_id || null,
    }));

    const { error: ingredientError } = await supabase
      .from("recipe_ingredients")
      .insert(formattedIngredients);

    if (ingredientError) {
      console.error("Error adding ingredients:", ingredientError.message);
    } else {
      console.log("Recipe added successfully!");
      setTitle("");
      setDescription("");
      setIngredients([]);
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Recipe Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Spaghetti Bolognese"
        style={styles.input}
      />

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Family favourite"
        style={styles.input}
      />

      <Text style={styles.label}>Add Ingredient</Text>
      <TextInput
        value={newIngredient.name}
        onChangeText={(text) =>
          setNewIngredient({ ...newIngredient, name: text })
        }
        placeholder="Ingredient name"
        style={styles.input}
      />
      <TextInput
        value={newIngredient.quantity}
        onChangeText={(text) =>
          setNewIngredient({ ...newIngredient, quantity: text })
        }
        placeholder="Quantity (optional)"
        keyboardType="numeric"
        style={styles.input}
      />
      <TextInput
        value={newIngredient.unit}
        onChangeText={(text) =>
          setNewIngredient({ ...newIngredient, unit: text })
        }
        placeholder="Unit (e.g. g, ml)"
        style={styles.input}
      />

      <FlatList
        data={categories}
        horizontal
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              setNewIngredient({ ...newIngredient, category_id: item.id })
            }
            style={[
              styles.category,
              item.id === newIngredient.category_id && styles.categorySelected,
            ]}
          >
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <Button title="Add Ingredient" onPress={addIngredient} />

      <FlatList
        data={ingredients}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={{ marginTop: 4 }}>
            {item.quantity ? `${item.quantity} ` : ""}
            {item.unit ? `${item.unit} ` : ""}
            {item.name}
          </Text>
        )}
        style={{ marginTop: 10 }}
      />

      <Button title="Save Recipe" onPress={submitRecipe} />
    </View>
  );
}

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
