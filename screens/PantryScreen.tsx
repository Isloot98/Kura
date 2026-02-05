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

import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

type PantryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Pantry"
>;

interface Props {
  navigation: PantryScreenNavigationProp;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const PantryCard = ({ item }: { item: PantryItem }) => {
  const [pressed, setPressed] = useState(false);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed ? 0.98 : 1, { duration: 120 }) }],
    opacity: withTiming(pressed ? 0.92 : 1, { duration: 120 }),
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(250).springify().damping(14)}
      exiting={FadeOut.duration(120)}
      layout={LinearTransition.springify().damping(16)}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
      >
        <Animated.View style={[styles.itemCard, pressStyle]}>
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
              {item.pantry_categories?.name ?? "Uncategorised"}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>
              Exp {new Date(item.expiry_date).toLocaleDateString()}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const PantryScreen: React.FC<Props> = ({ navigation }) => {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<"expiry" | "name" | "quantity">(
    "expiry",
  );
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );

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
      .select("*, pantry_categories(name)")
      .eq("user_id", user.id);

    if (error) {
      console.error("Fetch error:", error);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
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

  const handleAddPress = () => {
    navigation.navigate("AddItem");
  };

  const filteredAndSortedItems = items
    .filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .filter((item) =>
      selectedCategory
        ? item.pantry_categories?.name === selectedCategory
        : true,
    )
    .sort((a, b) => {
      if (sortOption === "expiry") {
        return (
          new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
        );
      } else if (sortOption === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortOption === "quantity") {
        return a.quantity - b.quantity;
      }
      return 0;
    });

  const renderItem = ({ item }: { item: PantryItem }) => (
    <PantryCard item={item} />
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
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
          {!!searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.controlsCard}>
          <Text style={styles.controlsTitle}>Filters</Text>

          <View style={styles.pickerShell}>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value)}
              style={styles.picker}
              dropdownIconColor="#111"
            >
              <Picker.Item label="All Categories" value={null} />
              {categories.map((cat) => (
                <Picker.Item key={cat.id} label={cat.name} value={cat.name} />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerShell}>
            <Picker
              selectedValue={sortOption}
              onValueChange={(value) => setSortOption(value)}
              style={styles.picker}
              dropdownIconColor="#111"
            >
              <Picker.Item label="Sort: Expiry" value="expiry" />
              <Picker.Item label="Sort: Name" value="name" />
              <Picker.Item label="Sort: Quantity" value="quantity" />
            </Picker>
          </View>
        </View>

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
            data={filteredAndSortedItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          />
        )}

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

  itemCard: {
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
