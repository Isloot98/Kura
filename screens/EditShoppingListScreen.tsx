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

const EditShoppingListScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();

  const { list } = route.params as {
    list: {
      id: string;
      name: string;
      shopping_list_items?: Array<ShoppingListItem>;
    };
  };

  const [listName, setListName] = useState(list.name);

  const [items, setItems] = useState<ShoppingListItem[]>(
    list.shopping_list_items?.map((item) => ({ ...item })) || [],
  );

  const [itemName, setItemName] = useState("");
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

  const canAddItem = useMemo(() => !!itemName.trim(), [itemName]);

  const addItem = () => {
    if (!itemName.trim()) return;

    setItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${Math.random()}`,
        name: itemName.trim(),
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit: unit || undefined,
        category_id: selectedCategoryId,
        isNew: true,
      },
    ]);

    setItemName("");
    setQuantity("");
    setUnit("");
    setSelectedCategoryId(null);
  };

  const deleteItemLocal = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const saveList = async () => {
    if (!listName.trim()) {
      Alert.alert("Validation", "Please enter a list name.");
      return;
    }

    setSaving(true);

    try {
      const { error: listError } = await supabase
        .from("shopping_lists")
        .update({ name: listName.trim() })
        .eq("id", list.id);

      if (listError) throw listError;

      const originalItemIds = list.shopping_list_items?.map((i) => i.id) || [];
      const currentItemIds = items.filter((i) => !i.isNew).map((i) => i.id);

      const deletedItemIds = originalItemIds.filter(
        (id) => !currentItemIds.includes(id),
      );

      if (deletedItemIds.length > 0) {
        const { error: delError } = await supabase
          .from("shopping_list_items")
          .delete()
          .in("id", deletedItemIds);

        if (delError) throw delError;
      }

      const newItems = items.filter((i) => i.isNew);

      if (newItems.length > 0) {
        const itemsToInsert = newItems.map((item) => ({
          name: item.name,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          category_id: item.category_id ?? null,
          shopping_list_id: list.id,
          is_checked: false,
        }));

        const { error: insertError } = await supabase
          .from("shopping_list_items")
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      Alert.alert("Saved ✅", "Shopping list updated.");
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update the shopping list.");
    } finally {
      setSaving(false);
    }
  };

  const Header = (
    <View style={{ gap: 12 }}>
      <Text style={styles.header}>Edit Shopping List</Text>

      <View style={styles.card}>
        <Text style={styles.label}>List name</Text>
        <TextInput
          value={listName}
          onChangeText={setListName}
          placeholder="e.g. Weekly Shop"
          placeholderTextColor="#9AA0A6"
          style={styles.input}
          returnKeyType="done"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add item</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={itemName}
          onChangeText={setItemName}
          placeholder="Item name"
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
              placeholder="kg / ml"
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

        <PressableScale onPress={addItem} disabled={!canAddItem}>
          <View
            style={[
              styles.primaryButton,
              !canAddItem && styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>Add item</Text>
          </View>
        </PressableScale>

        {!!items.length && (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionTitle}>Items</Text>
          </View>
        )}
      </View>

      <PressableScale onPress={saveList} disabled={saving}>
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

  const renderItemRow = ({ item }: { item: ShoppingListItem }) => {
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
        style={styles.itemRow}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            {!!item.isNew && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>NEW</Text>
              </View>
            )}
          </View>

          <Text style={styles.itemMeta}>
            {qtyPart ? `${qtyPart} • ` : ""}
            {catName || "No category"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => deleteItemLocal(item.id)}
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
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItemRow}
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

  itemRow: {
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
  itemName: { fontSize: 15, fontWeight: "900", color: "#111827" },
  itemMeta: {
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

export default EditShoppingListScreen;
