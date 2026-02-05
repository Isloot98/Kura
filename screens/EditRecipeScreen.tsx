import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

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

const PressableScale = ({
  children,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) => {
  const [pressed, setPressed] = useState(false);

  const aStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withTiming(pressed && !disabled ? 0.98 : 1, { duration: 120 }) },
    ],
  }));

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <Animated.View style={[aStyle, disabled && { opacity: 0.5 }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const EditRecipeScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();

  const { recipe } = route.params as {
    recipe: {
      id: string;
      title: string;
      recipe_ingredients?: Array<RecipeIngredient>;
    };
  };

  const [recipeTitle, setRecipeTitle] = useState(recipe.title);

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe.recipe_ingredients?.map((i) => ({ ...i })) || [],
  );

  const [ingredientName, setIngredientName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");

  const [categories, setCategories] = useState<PantryCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("pantry_categories").select();
      if (error) console.error(error);
      else setCategories((data as PantryCategory[]) || []);
    };
    fetchCategories();
  }, []);

  const canAddIngredient = useMemo(() => {
    return !!ingredientName.trim() && !!selectedCategoryId;
  }, [ingredientName, selectedCategoryId]);

  const addIngredient = () => {
    if (!ingredientName.trim()) {
      Alert.alert("Missing ingredient", "Please enter an ingredient name.");
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert(
        "Pick a category",
        "Please select a category for the ingredient.",
      );
      return;
    }

    setIngredients((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
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

  const deleteIngredientLocal = (id: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  const saveRecipe = async () => {
    if (!recipeTitle.trim()) {
      Alert.alert("Validation", "Please enter a recipe title.");
      return;
    }

    setSaving(true);

    try {
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
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          category_id: item.category_id ?? null,
          recipe_id: recipe.id,
        }));

        const { error: insertError } = await supabase
          .from("recipe_ingredients")
          .insert(toInsert);

        if (insertError) throw insertError;
      }

      Alert.alert("Saved ✅", "Recipe updated.");
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update the recipe.");
    } finally {
      setSaving(false);
    }
  };

  const Header = (
    <View style={{ gap: 12 }}>
      <Text style={styles.header}>Edit Recipe</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Recipe title</Text>
        <TextInput
          value={recipeTitle}
          onChangeText={setRecipeTitle}
          placeholder="e.g. Chicken Curry"
          placeholderTextColor="#9AA0A6"
          style={styles.input}
          returnKeyType="done"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add ingredient</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={ingredientName}
          onChangeText={setIngredientName}
          placeholder="Ingredient name"
          placeholderTextColor="#9AA0A6"
          style={styles.input}
          returnKeyType="done"
        />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Qty</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Optional"
              placeholderTextColor="#9AA0A6"
              keyboardType="numeric"
              style={styles.input}
              returnKeyType="done"
            />
          </View>

          <View style={{ width: 110 }}>
            <Text style={styles.label}>Unit</Text>
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="g / ml"
              placeholderTextColor="#9AA0A6"
              style={styles.input}
              returnKeyType="done"
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
            const selected = item.id === selectedCategoryId;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(item.id)}
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

        <PressableScale onPress={addIngredient} disabled={!canAddIngredient}>
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

      {/* Save */}
      <PressableScale onPress={saveRecipe} disabled={saving}>
        <View style={[styles.saveButton, saving && { opacity: 0.6 }]}>
          <Text style={styles.saveButtonText}>
            {saving ? "Saving…" : "Save changes"}
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

  const renderIngredient = ({ item }: { item: RecipeIngredient }) => {
    const catName = item.category_id
      ? categories.find((c) => c.id === item.category_id)?.name
      : null;

    const qtyPart =
      item.quantity != null
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.ingredientName}>{item.name}</Text>
            {!!item.isNew && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>NEW</Text>
              </View>
            )}
          </View>

          <Text style={styles.ingredientMeta}>
            {qtyPart ? `${qtyPart} • ` : ""}
            {catName || "No category"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => deleteIngredientLocal(item.id)}
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
};

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
    marginTop: 10,
  },
  primaryButtonDisabled: { opacity: 0.5 },
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

  badge: {
    backgroundColor: "#111827",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 0.5,
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

export default EditRecipeScreen;
