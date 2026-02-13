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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { Picker } from "@react-native-picker/picker";
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

  // Fetch pantry items
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

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", fetchPantryItems);
    return unsubscribe;
  }, [navigation]);

  const handleAddPress = () => {
    navigation.navigate("AddItem");
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

        <View style={styles.pill}>
          <Text style={styles.pillText}>
            {item.quantity} {item.unit}
          </Text>
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

    const totalQuantity = Object.values(groups)
      .flat()
      .reduce((sum, i) => sum + i.quantity, 0);

    return (
      <View key={category} style={styles.groupContainer}>
        <TouchableOpacity
          onPress={() => toggleCategory(category)}
          style={styles.groupHeader}
        >
          <Text style={styles.groupTitle}>{category}</Text>

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
          <Ionicons
            name="search"
            size={18}
            color="#6B7280"
            style={{ marginRight: 8 }}
          />
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
            <Text style={styles.loadingText}>Loading pantry…</Text>
          </View>
        ) : filteredAndSortedItems.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="cube-outline" size={38} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptySub}>
              Scan a barcode or add an item to get started.
            </Text>
          </View>
        ) : (
          <FlatList
            data={Object.entries(groupedCategories)}
            keyExtractor={([category]) => category}
            renderItem={({ item }) => renderCategory(item[0], item[1])}
            contentContainerStyle={{ paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddPress}
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
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  clearBtn: { paddingLeft: 8, paddingVertical: 2 },
  controlsCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  controlsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  pickerShell: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  picker: {
    height: 48,
    color: "#111827",
  },
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  pill: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  metaText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
  },
  metaDot: {
    marginHorizontal: 8,
    color: "#D1D5DB",
    fontWeight: "900",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 10,
    color: "#6B7280",
    fontWeight: "700",
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

export default PantryScreen;
