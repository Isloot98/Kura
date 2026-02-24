import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { RootStackParamList, PantryItem } from "../lib/navigationTypes";

type PantryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Pantry"
>;

interface Props {
  navigation: PantryScreenNavigationProp;
}

type GroupedCategories = {
  [category: string]: {
    [group: string]: PantryItem[];
  };
};

const PantryScreen: React.FC<Props> = ({ navigation }) => {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const [sortOption, setSortOption] = useState<"expiry" | "name" | "quantity">(
    "expiry",
  );

  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );

  const [itemGroups, setItemGroups] = useState<{ id: number; name: string }[]>(
    [],
  );

  const [expandedCategories, setExpandedCategories] = useState<{
    [key: string]: boolean;
  }>({});

  const [expandedGroups, setExpandedGroups] = useState<{
    [key: string]: boolean;
  }>({});
  const [useModalVisible, setUseModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PantryItem | null>(null);
  const [useAmount, setUseAmount] = useState("");

  const fetchPantryItems = async () => {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("pantry_items")
      .select("*, pantry_categories(name), pantry_groups(name)")
      .eq("user_id", user.id);

    if (error) {
      console.error("Fetch error:", error);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPantryItems();
    const unsubscribe = navigation.addListener("focus", fetchPantryItems);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("pantry_categories")
        .select("id, name");

      if (error) {
        console.error("Category fetch error:", error);
      } else {
        setCategories(data || []);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data, error } = await supabase
        .from("pantry_groups")
        .select("id, name");

      if (error) {
        console.error("Group fetch error:", error);
      } else {
        setItemGroups(data || []);
      }
    };

    fetchGroups();
  }, []);

  const handleAddPress = () => {
    navigation.navigate("AddItem");
  };
  // Use item logic

  const handleUseSubmit = async () => {
    if (!selectedItem) return;

    const used = parseFloat(useAmount);

    if (isNaN(used) || used <= 0) {
      console.log("Invalid amount");
      return;
    }

    if (used > selectedItem.quantity) {
      console.log("Cannot use more than available");
      return;
    }

    const newQuantity = Number((selectedItem.quantity - used).toFixed(3));

    console.log("Updating item:", selectedItem.id);
    console.log("Old qty:", selectedItem.quantity);
    console.log("New qty:", newQuantity);

    let response;

    if (newQuantity <= 0) {
      response = await supabase
        .from("pantry_items")
        .delete()
        .eq("id", selectedItem.id);
    } else {
      response = await supabase
        .from("pantry_items")
        .update({ quantity: newQuantity })
        .eq("id", selectedItem.id)
        .select(); // 👈 important for debugging
    }

    if (response.error) {
      console.log("Supabase error:", response.error);
      return;
    }

    console.log("Update success:", response.data);

    setUseModalVisible(false);
    setUseAmount("");
    setSelectedItem(null);

    fetchPantryItems();
  };
  // Filter + Sort
  const filteredAndSortedItems = items
    .filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .filter((item) =>
      selectedCategory
        ? item.pantry_categories?.name === selectedCategory
        : true,
    )
    .filter((item) =>
      selectedGroup ? item.pantry_groups?.name === selectedGroup : true,
    )
    .sort((a, b) => {
      if (sortOption === "expiry") {
        return (
          new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
        );
      } else if (sortOption === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return a.quantity - b.quantity;
      }
    });

  // Nested grouping
  const groupedCategories: GroupedCategories = filteredAndSortedItems.reduce(
    (acc, item) => {
      const category = item.pantry_categories?.name || "Uncategorised";
      const group = item.pantry_groups?.name || "Uncategorised";

      if (!acc[category]) acc[category] = {};
      if (!acc[category][group]) acc[category][group] = [];

      acc[category][group].push(item);

      return acc;
    },
    {} as GroupedCategories,
  );

  // Toggles
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const toggleGroup = (category: string, group: string) => {
    const key = `${category}-${group}`;

    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Item renderer
  const renderItemCard = (item: PantryItem) => (
    <View key={item.id} style={styles.itemCard}>
      <View style={styles.itemTopRow}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>

        <View style={styles.quantityContainer}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {item.quantity} {item.unit}
            </Text>

            <TouchableOpacity
              onPress={() => {
                setSelectedItem(item);
                setUseModalVisible(true);
              }}
              style={styles.useButton}
            >
              <Ionicons name="restaurant-outline" size={16} color="#2563EB" />
              <Text style={styles.useText}>Use</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.itemMetaRow}>
        <Text style={styles.metaText}>
          Exp{" "}
          {item.expiry_date
            ? new Date(item.expiry_date).toLocaleDateString()
            : "No expiry"}
        </Text>
      </View>
    </View>
  );

  const renderNestedGroup = (
    category: string,
    group: string,
    items: PantryItem[],
  ) => {
    const key = `${category}-${group}`;
    const isExpanded = expandedGroups[key] || false;

    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
      <View key={key}>
        <TouchableOpacity
          onPress={() => toggleGroup(category, group)}
          style={[styles.groupHeader, { backgroundColor: "#fff" }]}
        >
          <Text style={[styles.groupTitle, { fontSize: 15 }]}>{group}</Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.groupTotal}>{totalQuantity}</Text>
            <Ionicons
              name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"}
              size={18}
              color="#111827"
              style={{ marginLeft: 6 }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && items.map(renderItemCard)}
      </View>
    );
  };

  const renderCategory = (
    category: string,
    groups: Record<string, PantryItem[]>,
  ) => {
    const isExpanded = expandedCategories[category] || false;

    return (
      <View key={category} style={styles.groupContainer}>
        <TouchableOpacity
          onPress={() => toggleCategory(category)}
          style={styles.groupHeader}
        >
          <Text style={styles.groupTitle}>{category}</Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"}
              size={18}
              color="#111827"
              style={{ marginLeft: 6 }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded &&
          Object.entries(groups).map(([group, items]) =>
            renderNestedGroup(category, group, items as PantryItem[]),
          )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* SEARCH */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Search pantry"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* LIST */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={Object.entries(groupedCategories)}
            keyExtractor={([category]) => category}
            renderItem={({ item }) => renderCategory(item[0], item[1])}
            contentContainerStyle={{ paddingBottom: 110 }}
          />
        )}

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {/* USE MODAL */}
        <Modal visible={useModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                How much did you use? ({selectedItem?.unit})
              </Text>

              <TextInput
                keyboardType="numeric"
                value={useAmount}
                onChangeText={setUseAmount}
                style={styles.modalInput}
                placeholder="Enter amount"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setUseModalVisible(false);
                    setUseAmount("");
                    setSelectedItem(null);
                  }}
                >
                  <Text style={{ color: "#6B7280" }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleUseSubmit}>
                  <Text style={{ fontWeight: "bold" }}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 16, marginLeft: 8 },
  groupContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  groupHeader: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupTitle: { fontWeight: "900", fontSize: 16 },
  groupTotal: { fontWeight: "700", fontSize: 14, color: "#6B7280" },
  itemCard: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 14,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemName: { flex: 1, fontSize: 16, fontWeight: "900" },
  pill: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pillText: { fontSize: 13, fontWeight: "800" },
  itemMetaRow: { marginTop: 10 },
  metaText: { fontSize: 13, color: "#6B7280" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quantityContainer: {
    alignItems: "center",
  },

  useButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  useText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
});

export default PantryScreen;
