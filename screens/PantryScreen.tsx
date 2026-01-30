import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
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

const PantryScreen: React.FC<Props> = ({ navigation }) => {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<"expiry" | "name" | "quantity">(
    "expiry"
  );
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );

  const fetchPantryItems = async () => {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User fetch error:", userError);
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
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((item) =>
      selectedCategory
        ? item.pantry_categories?.name === selectedCategory
        : true
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
    <View style={styles.itemCard}>
      <Text style={styles.itemText}>{item.name}</Text>
      <Text style={styles.subText}>
        {item.quantity} {item.unit}
      </Text>
      <Text style={styles.subText}>{item.pantry_categories?.name}</Text>
      <Text style={styles.subText}>
        Exp: {new Date(item.expiry_date).toDateString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search items"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.input}
        placeholderTextColor="#000"
      />

      <Picker
        selectedValue={selectedCategory}
        onValueChange={(value) => setSelectedCategory(value)}
        style={styles.picker}
      >
        <Picker.Item label="All Categories" value={null} />
        {categories.map((cat) => (
          <Picker.Item key={cat.id} label={cat.name} value={cat.name} />
        ))}
      </Picker>

      <Picker
        selectedValue={sortOption}
        onValueChange={(value) => setSortOption(value)}
        style={styles.picker}
      >
        <Picker.Item label="Sort by Expiry" value="expiry" />
        <Picker.Item label="Sort by Name" value="name" />
        <Picker.Item label="Sort by Quantity" value="quantity" />
      </Picker>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : filteredAndSortedItems.length === 0 ? (
        <Text>No items in pantry</Text>
      ) : (
        <FlatList
          data={filteredAndSortedItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#8A9A5B",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  itemCard: {
    padding: 12,
    marginVertical: 8,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
  },
  itemText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  subText: {
    fontSize: 14,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  picker: {
    marginBottom: 10,
    backgroundColor: "#E5E4E2",
    borderRadius: 8,
    color: "black",
  },
});

export default PantryScreen;
