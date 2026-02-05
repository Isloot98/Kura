import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("pantry_categories").select();
      if (error) console.error("Category fetch error:", error);
      else setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const canAddIngredient = useMemo(() => {
    return !!newIngredient.name.trim() && !!newIngredient.category_id;
  }, [newIngredient]);

  const addIngredient = () => {
    if (!newIngredient.name.trim()) {
      Alert.alert("Missing ingredient", "Please enter an ingredient name.");
      return;
    }
    if (!newIngredient.category_id) {
      Alert.alert(
        "Pick a category",
        "Please select a category for the ingredient.",
      );
      return;
    }

    setIngredients((prev) => [
      ...prev,
      { ...newIngredient, id: `${Date.now()}-${Math.random()}` },
    ]);

    setNewIngredient({ name: "", quantity: "", unit: "", category_id: null });
  };

  const removeIngredient = (id) => {
    setIngredients((prev) => prev.filter((x) => x.id !== id));
  };

  const submitRecipe = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Give your recipe a name.");
      return;
    }
    if (!ingredients.length) {
      Alert.alert("No ingredients", "Add at least one ingredient.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("User not authenticated");

      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert([
          {
            title: title.trim(),
            description: description.trim(),
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (recipeError) throw recipeError;

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

      if (ingredientError) throw ingredientError;

      // reset
      setTitle("");
      setDescription("");
      setIngredients([]);
      setNewIngredient({ name: "", quantity: "", unit: "", category_id: null });

      navigation.goBack();
    } catch (e) {
      console.error("Save recipe error:", e);
      Alert.alert("Error", e?.message || "Failed to save recipe.");
    } finally {
      setSaving(false);
    }
  };

  const Header = (
    <View style={{ gap: 12 }}>
      <Text style={styles.header}>New Recipe</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Recipe title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Spaghetti Bolognese"
          placeholderTextColor="#9AA0A6"
          style={styles.input}
          returnKeyType="done"
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional notes…"
          placeholderTextColor="#9AA0A6"
          style={[styles.input, { height: 46 }]}
          returnKeyType="done"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add ingredient</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={newIngredient.name}
          onChangeText={(text) =>
            setNewIngredient((p) => ({ ...p, name: text }))
          }
          placeholder="e.g. Mince"
          placeholderTextColor="#9AA0A6"
          style={styles.input}
        />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Qty</Text>
            <TextInput
              value={newIngredient.quantity}
              onChangeText={(text) =>
                setNewIngredient((p) => ({ ...p, quantity: text }))
              }
              placeholder="Optional"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={{ width: 110 }}>
            <Text style={styles.label}>Unit</Text>
            <TextInput
              value={newIngredient.unit}
              onChangeText={(text) =>
                setNewIngredient((p) => ({ ...p, unit: text }))
              }
              placeholder="g / ml"
              placeholderTextColor="#9AA0A6"
              style={styles.input}
            />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 6 }]}>Category</Text>
        <FlatList
          data={categories}
          horizontal
          keyExtractor={(item) => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 6 }}
          renderItem={({ item }) => {
            const selected = item.id === newIngredient.category_id;
            return (
              <TouchableOpacity
                onPress={() =>
                  setNewIngredient((p) => ({ ...p, category_id: item.id }))
                }
                activeOpacity={0.85}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <PressableScale onPress={addIngredient} style={{ marginTop: 10 }}>
          <View
            style={[
              styles.primaryButton,
              !canAddIngredient && styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>Add ingredient</Text>
          </View>
        </PressableScale>

        {!!ingredients.length && (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
          </View>
        )}
      </View>

      {/* Save recipe */}
      <PressableScale onPress={submitRecipe} style={{ marginTop: 4 }}>
        <View style={[styles.saveButton, saving && { opacity: 0.6 }]}>
          <Text style={styles.saveButtonText}>
            {saving ? "Saving…" : "Save Recipe"}
          </Text>
        </View>
      </PressableScale>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.cancelButton}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderIngredient = ({ item }) => {
    const catName =
      categories.find((c) => c.id === item.category_id)?.name ||
      "Uncategorised";

    const qtyPart = item.quantity
      ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
      : "";

    return (
      <Animated.View
        entering={FadeInDown.duration(140)}
        exiting={FadeOut.duration(120)}
        layout={LinearTransition.springify().damping(16)}
        style={styles.ingredientRow}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.ingredientName}>{item.name}</Text>
          <Text style={styles.ingredientMeta}>
            {qtyPart ? `${qtyPart} • ` : ""}
            {catName}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => removeIngredient(item.id)}
          activeOpacity={0.75}
        >
          <Ionicons name="close-circle" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={ingredients}
          keyExtractor={(item) => item.id}
          renderItem={renderIngredient}
          ListHeaderComponent={Header}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={{ height: 6 }} />}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },

  container: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },

  header: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    marginBottom: 2,
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

  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: 0.2,
    marginBottom: 6,
  },

  label: {
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
    fontSize: 12,
    letterSpacing: 0.2,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },

  row2: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  chipSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  chipText: { color: "#111827", fontWeight: "800", fontSize: 13 },
  chipTextSelected: { color: "#fff" },

  primaryButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  ingredientRow: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ingredientName: { fontSize: 15, fontWeight: "900", color: "#111827" },
  ingredientMeta: {
    marginTop: 4,
    color: "#6B7280",
    fontWeight: "800",
    fontSize: 12,
  },

  saveButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 2,
  },
  saveButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  cancelButton: { alignItems: "center", paddingVertical: 10 },
  cancelText: { color: "#6B7280", fontWeight: "900" },
});
