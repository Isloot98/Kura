// screens/ShoppingListScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useCallback } from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  RootStackParamList,
  ShoppingList,
  ShoppingListItem,
} from "../lib/navigationTypes";

import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

type ShoppingListScreenNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "ShoppingList"
>;

const ShoppingListCard = ({
  list,
  isExpanded,
  onToggle,
  onEdit,
  onDeleteList,
  onAddToPantry,
  onDeleteItem,
}: {
  list: ShoppingList;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDeleteList: () => void;
  onAddToPantry: () => void;
  onDeleteItem: (id: string) => void;
}) => {
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: withTiming(isExpanded ? "180deg" : "0deg", { duration: 180 }) },
    ],
  }));

  const itemsCount = list.shopping_list_items?.length || 0;
  const checkedCount =
    list.shopping_list_items?.filter((i: any) => i.is_checked).length || 0;

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
            {list.name}
          </Text>

          <View style={styles.subRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {checkedCount}/{itemsCount} checked
              </Text>
            </View>
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
          <Text style={styles.sectionLabel}>Items</Text>

          {itemsCount ? (
            <View style={styles.itemsWrap}>
              {list.shopping_list_items.map((subItem: any) => (
                <View key={subItem.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {subItem.name}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {subItem.quantity
                        ? `${subItem.quantity} ${subItem.unit || ""}`
                        : "—"}
                      {subItem.pantry_categories?.name
                        ? ` • ${subItem.pantry_categories.name}`
                        : ""}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => onDeleteItem(subItem.id)}
                    style={styles.iconBtn}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="trash-outline" size={18} color="#991B1B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.italic}>No items yet</Text>
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
              onPress={onAddToPantry}
              activeOpacity={0.9}
            >
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={[styles.actionText, { color: "#fff" }]}>
                Add to Pantry
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionDanger]}
              onPress={onDeleteList}
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
          pantry_categories ( name )
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setLists(data || []);
  };

  useFocusEffect(
    useCallback(() => {
      fetchLists();
    }, []),
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleDeleteList = async (id: string) => {
    Alert.alert("Delete list?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("shopping_lists")
            .delete()
            .eq("id", id);
          if (error) console.error("Delete list error:", error);
          else fetchLists();
        },
      },
    ]);
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

    const pantryItems = list.shopping_list_items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity || null,
      unit: item.unit || null,
      category_id: item.category_id || null,
      user_id: user.id,
      added_from_list_id: list.id,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("pantry_items").insert(pantryItems);

    if (error) {
      console.error("Error adding to pantry:", error);
    } else {
      Alert.alert("Added ✅", "Items added to pantry.");
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isExpanded = expandedIds.includes(item.id);

    return (
      <ShoppingListCard
        list={item}
        isExpanded={isExpanded}
        onToggle={() => toggleExpand(item.id)}
        onEdit={() => navigation.navigate("EditShoppingList", { list: item })}
        onDeleteList={() => handleDeleteList(item.id)}
        onAddToPantry={() => handleAddToPantry(item)}
        onDeleteItem={(subId) => handleDeleteItem(subId)}
      />
    );
  };

  const empty = lists.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {empty ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="cart-outline" size={42} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No shopping lists yet</Text>
            <Text style={styles.emptySub}>
              Create a list, then add items or generate one from a recipe.
            </Text>
          </View>
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddShoppingList")}
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

  subRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  chip: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, fontWeight: "800", color: "#111827" },

  content: { marginTop: 12 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B7280",
    letterSpacing: 0.4,
    marginBottom: 8,
  },

  itemsWrap: { gap: 10 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  itemName: { fontWeight: "900", color: "#111827" },
  itemMeta: { marginTop: 4, color: "#6B7280", fontWeight: "700", fontSize: 12 },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
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
  actionPrimary: { backgroundColor: "#111827", borderColor: "#111827" },
  actionDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },

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

export default ShoppingListScreen;
