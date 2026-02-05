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
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "../lib/supabase";

const PressableScale = ({ children, onPress, style, disabled }) => {
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
      style={style}
    >
      <Animated.View style={[aStyle, disabled && { opacity: 0.5 }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function AddShoppingListScreen({ navigation }) {
  const [listName, setListName] = useState("");

  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("pantry_categories").select();
      if (error) console.error(error);
      else setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const canAddItem = useMemo(() => {
    return !!itemName.trim();
  }, [itemName]);

  const addItem = () => {
    if (!itemName.trim()) return;

    setItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        name: itemName.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit ? unit.trim() : null,
        category_id: selectedCategoryId,
      },
    ]);

    setItemName("");
    setQuantity("");
    setUnit("");
    setSelectedCategoryId(null);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const createList = async () => {
    if (!listName.trim()) {
      Alert.alert("Missing name", "Give your list a name.");
      return;
    }
    if (!items.length) {
      Alert.alert("No items", "Add at least one item.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("User not authenticated");

      const { data: listData, error: listError } = await supabase
        .from("shopping_lists")
        .insert({ name: listName.trim(), user_id: user.id })
        .select()
        .single();

      if (listError || !listData)
        throw listError || new Error("List create failed");

      const itemsToInsert = items.map((item) => ({
        name: item.name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        category_id: item.category_id ?? null,
        shopping_list_id: listData.id,
      }));

      const { error: itemsError } = await supabase
        .from("shopping_list_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      navigation.goBack();
    } catch (e) {
      console.error("Create list error:", e);
      Alert.alert("Error", e?.message || "Failed to create list.");
    } finally {
      setSaving(false);
    }
  };

  const Header = (
    <View style={{ gap: 12 }}>
      <Text style={styles.header}>New Shopping List</Text>

      {/* List name */}
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

      {/* Add item */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add item</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={itemName}
          onChangeText={setItemName}
          placeholder="e.g. Chicken"
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

      {/* Create list */}
      <PressableScale onPress={createList} disabled={saving}>
        <View style={[styles.saveButton, saving && { opacity: 0.6 }]}>
          <Text style={styles.saveButtonText}>
            {saving ? "Creating…" : "Create Shopping List"}
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

  const renderListItem = ({ item }) => {
    const catName = item.category_id
      ? categories.find((c) => c.id === item.category_id)?.name
      : null;

    const qtyPart =
      item.quantity != null
        ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
        : null;

    return (
      <Animated.View
        entering={FadeInDown.duration(140)}
        exiting={FadeOut.duration(120)}
        layout={LinearTransition.springify().damping(16)}
        style={styles.itemRow}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            {qtyPart ? `${qtyPart} • ` : ""}
            {catName || "No category"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => removeItem(item.id)}
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
          renderItem={renderListItem}
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
