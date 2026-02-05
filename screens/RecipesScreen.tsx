import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
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

import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "RecipeListScreen"
>;

const RecipeCard = ({
  recipe,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddToShopping,
}: {
  recipe: Recipe;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddToShopping: () => void;
}) => {
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: withTiming(isExpanded ? "180deg" : "0deg", { duration: 180 }) },
    ],
  }));

  const ingredientsCount = recipe.recipe_ingredients?.length || 0;

  return (
    <Animated.View
      style={styles.card}
      entering={FadeInDown.duration(220).springify().damping(14)}
      exiting={FadeOut.duration(120)}
      layout={LinearTransition.springify().damping(16)}
    >
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.9}
        style={styles.header}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {recipe.title}
          </Text>

          <View style={styles.subRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {ingredientsCount} ingredients
              </Text>
            </View>

            {!!recipe.description && (
              <Text style={styles.subText} numberOfLines={1}>
                {recipe.description}
              </Text>
            )}
          </View>
        </View>

        <Animated.View style={[styles.chevWrap, arrowStyle]}>
          <Ionicons name="chevron-down" size={20} color="#111827" />
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View
          style={styles.content}
          entering={FadeInDown.duration(160)}
          exiting={FadeOut.duration(120)}
          layout={LinearTransition.springify().damping(16)}
        >
          {!!recipe.description && (
            <Text style={styles.description}>{recipe.description}</Text>
          )}

          <Text style={styles.sectionLabel}>Ingredients</Text>

          {ingredientsCount ? (
            <View style={styles.ingredientsWrap}>
              {recipe.recipe_ingredients.map((ing: RecipeIngredient) => (
                <View key={ing.id} style={styles.ingredientRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.ingredientText}>
                    {ing.name}
                    {ing.quantity
                      ? `  (${ing.quantity}${ing.unit ? ` ${ing.unit}` : ""})`
                      : ""}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.italic}>No ingredients listed</Text>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onEdit}
              activeOpacity={0.9}
            >
              <Ionicons name="create-outline" size={16} color="#111827" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPrimary]}
              onPress={onAddToShopping}
              activeOpacity={0.9}
            >
              <Ionicons name="cart-outline" size={16} color="#fff" />
              <Text style={[styles.actionText, { color: "#fff" }]}>
                Add to Shopping
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionDanger]}
              onPress={onDelete}
              activeOpacity={0.9}
            >
              <Ionicons name="trash-outline" size={16} color="#991B1B" />
              <Text style={[styles.actionText, { color: "#991B1B" }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

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
      `,
      )
      .order("created_at", { ascending: false });

    if (error) console.error("Fetch error:", error);
    else setRecipes(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      fetchRecipes();
    }, []),
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleDeleteRecipe = async (id: string) => {
    Alert.alert("Delete recipe?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("recipes")
            .delete()
            .eq("id", id);
          if (error) console.error("Delete error:", error);
          else fetchRecipes();
        },
      },
    ]);
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
    else Alert.alert("Added ✅", "Ingredients added to a new shopping list.");
  };

  const renderItem = ({ item }: { item: Recipe }) => {
    const isExpanded = expandedIds.includes(item.id);

    return (
      <RecipeCard
        recipe={item}
        isExpanded={isExpanded}
        onToggle={() => toggleExpand(item.id)}
        onEdit={() => navigation.navigate("EditRecipeScreen", { recipe: item })}
        onDelete={() => handleDeleteRecipe(item.id)}
        onAddToShopping={() => handleAddToShoppingList(item)}
      />
    );
  };

  const empty = recipes.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {empty ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="book-outline" size={42} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No recipes yet</Text>
            <Text style={styles.emptySub}>
              Add your first recipe and we’ll keep it here for quick shopping
              lists.
            </Text>
          </View>
        ) : (
          <FlatList
            data={recipes}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddRecipeScreen")}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chevWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  title: { fontSize: 16, fontWeight: "900", color: "#111827" },

  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: "800", color: "#111827" },
  subText: { flex: 1, fontSize: 12, color: "#6B7280", fontWeight: "700" },

  content: { marginTop: 12 },
  description: { color: "#374151", lineHeight: 18, marginBottom: 10 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B7280",
    letterSpacing: 0.4,
    marginBottom: 8,
  },

  ingredientsWrap: { gap: 6 },
  ingredientRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bullet: { color: "#9CA3AF", fontWeight: "900", marginTop: 1 },
  ingredientText: {
    flex: 1,
    color: "#111827",
    fontWeight: "700",
    lineHeight: 18,
  },
  italic: { color: "#6B7280", fontStyle: "italic" },

  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionText: { fontWeight: "900", color: "#111827" },
  actionPrimary: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  actionDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },

  fab: {
    position: "absolute",
    bottom: 26,
    right: 18,
    backgroundColor: "#111827",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
});

export default RecipeListScreen;
