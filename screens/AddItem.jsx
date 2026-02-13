import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import debounce from "lodash.debounce";
import { searchProducts } from "../lib/openFoodFacts.js";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

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

const AddItem = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("g");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const [searchResults, setSearchResults] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suppressSearch, setSuppressSearch] = useState(false);

  const [itemGroups, setItemGroups] = useState([]);
  const [itemGroupName, setItemGroupName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("pantry_categories")
        .select("*")
        .order("name");
      if (error) console.error("Failed to fetch categories:", error);
      else {
        setCategories(data || []);
        if ((data || []).length > 0) setSelectedCategoryId(data[0].id);
      }
    };
    fetchCategories();
  }, []);

  const fetchItemGroups = async () => {
    const { data, error } = await supabase
      .from("pantry_groups")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) console.error("Failed to fetch item groups:", error);
    else setItemGroups(data || []);
  };

  useEffect(() => {
    fetchItemGroups();
  }, []);

  const handleCreateNewGroup = async () => {
    if (!newGroupName.trim()) return null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in to create a group");
        return null;
      }

      const { data: newGroup, error } = await supabase
        .from("pantry_groups")
        .insert([{ name: newGroupName.trim(), user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setItemGroups((prev) => [...prev, newGroup]);
      setSelectedGroupId(newGroup.id);
      setItemGroupName("");
      setNewGroupName("");

      return newGroup.id;
    } catch (err) {
      console.error("Failed to create new group:", err);
      Alert.alert("Error", "Could not create new item group");
      return null;
    }
  };

  const handleAddItem = async () => {
    if (!name || !unit || !quantity) {
      Alert.alert("Please fill in all required fields");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in to add items");
        return;
      }

      let groupId = selectedGroupId;
      if (!groupId && newGroupName) groupId = await handleCreateNewGroup();
      if (!groupId) {
        Alert.alert("Select an Item Group or create a new one");
        return;
      }

      const canonicalName = name.toLowerCase().trim();
      const { data: newItem, error } = await supabase
        .from("pantry_items")
        .insert([
          {
            name: canonicalName,
            quantity: Number(quantity),
            unit,
            expiry_date: expiryDate.toISOString(),
            category_id: selectedCategoryId,
            user_id: user.id,
            group_id: groupId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      Alert.alert("Success", "Item added successfully");
      fetchItemGroups();
      navigation.navigate("MainTabs", { screen: "Pantry" });
    } catch (err) {
      console.error("Failed to add item:", err);
      Alert.alert("Error adding item", err.message);
    }
  };

  const onChange = (event, selectedDate) => {
    if (event?.type === "set" && selectedDate) setExpiryDate(selectedDate);
    setShowDatePicker(false);
  };

  const debouncedSearch = useMemo(
    () =>
      debounce(async (text) => {
        if (text.length < 3) return setSearchResults([]);
        setLoadingSuggestions(true);
        try {
          const results = await searchProducts(text);
          setSearchResults(results || []);
        } catch (err) {
          console.error("Search failed:", err);
        } finally {
          setLoadingSuggestions(false);
        }
      }, 600),
    [],
  );

  useEffect(() => {
    if (suppressSearch) {
      setSuppressSearch(false);
      return;
    }
    debouncedSearch(name);
    return () => debouncedSearch.cancel();
  }, [name, debouncedSearch, suppressSearch]);

  const handleSuggestionPress = (product) => {
    setSuppressSearch(true);
    setName(product.name || "");
    setQuantity((product.quantity || "").replace(/[^\d.]/g, ""));
    setSearchResults([]);
  };

  useEffect(() => {
    if (!route.params?.scannedItem) return;
    const scannedItem = route.params.scannedItem;
    setSuppressSearch(true);
    setSearchResults([]);
    setName(scannedItem.name || "");
    setQuantity(
      scannedItem.quantity ? scannedItem.quantity.replace(/[^\d.]/g, "") : "",
    );
    if (scannedItem.unit) setUnit(scannedItem.unit);
    if (scannedItem.mappedCategoryId)
      setSelectedCategoryId(scannedItem.mappedCategoryId);
    navigation.setParams({ scannedItem: null });
  }, [route.params?.scannedItem, navigation]);

  const filteredGroups = itemGroups.filter((g) =>
    g.name.toLowerCase().includes(itemGroupName.toLowerCase()),
  );

  const Header = (
    <View style={{ gap: 12 }}>
      <PressableScale
        onPress={() =>
          navigation.navigate("BarcodeScanner", { from: "AddItem" })
        }
        style={styles.scanWrap}
      >
        <View style={styles.scanButton}>
          <Ionicons name="barcode-outline" size={18} color="#fff" />
          <Text style={styles.scanButtonText}>Scan Barcode</Text>
        </View>
      </PressableScale>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="e.g. Apples"
            placeholderTextColor="#9AA0A6"
            value={name}
            onChangeText={setName}
            style={styles.input}
            returnKeyType="done"
          />
          {!!name && (
            <TouchableOpacity
              onPress={() => setName("")}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {loadingSuggestions && (
          <View style={styles.suggestLoading}>
            <ActivityIndicator size="small" />
            <Text style={styles.suggestLoadingText}>Searching…</Text>
          </View>
        )}

        {searchResults.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(160)}
            exiting={FadeOut.duration(120)}
            layout={LinearTransition.springify().damping(16)}
            style={{ marginTop: 10 }}
          >
            <Text style={styles.suggestionsTitle}>Suggestions</Text>
            <View style={styles.suggestionsBox}>
              {searchResults.slice(0, 8).map((item, index) => (
                <TouchableOpacity
                  key={`${item.name || "item"}-${index}`}
                  onPress={() => handleSuggestionPress(item)}
                  style={[
                    styles.suggestionRow,
                    index === 7 ? { borderBottomWidth: 0 } : null,
                  ]}
                >
                  <Text style={styles.suggestionName}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerShell}>
          <Picker
            selectedValue={selectedCategoryId}
            onValueChange={(v) => setSelectedCategoryId(v)}
            style={styles.picker}
            dropdownIconColor="#111"
          >
            {categories.map((cat) => (
              <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
            ))}
          </Picker>
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Unit</Text>
        <View style={styles.pickerShell}>
          <Picker
            selectedValue={unit}
            onValueChange={(v) => setUnit(v)}
            style={styles.picker}
            dropdownIconColor="#111"
          >
            <Picker.Item label="Grams (g)" value="g" />
            <Picker.Item label="Milliliters (ml)" value="ml" />
            <Picker.Item label="Pieces (pcs)" value="pcs" />
            <Picker.Item label="Liters (l)" value="l" />
            <Picker.Item label="Kilograms (kg)" value="kg" />
          </Picker>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Quantity</Text>
        <TextInput
          placeholder="e.g. 500"
          placeholderTextColor="#9AA0A6"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          style={styles.qtyInput}
        />

        <View style={styles.row}>
          <Text style={styles.metaText}>
            Expiry: {expiryDate.toDateString()}
          </Text>
          <PressableScale onPress={() => setShowDatePicker(true)}>
            <View style={styles.secondaryButton}>
              <Ionicons name="calendar-outline" size={16} color="#111" />
              <Text style={styles.secondaryButtonText}>Pick date</Text>
            </View>
          </PressableScale>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={expiryDate}
            mode="date"
            display="default"
            onChange={onChange}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Select Item Group</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Search Item Groups..."
            placeholderTextColor="#9AA0A6"
            value={itemGroupName}
            onChangeText={(text) => {
              setItemGroupName(text);
              setSelectedGroupId(null);
            }}
            style={styles.input}
          />
        </View>

        <FlatList
          data={filteredGroups}
          keyExtractor={(g) => g.id.toString()}
          style={{ maxHeight: 150, marginTop: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedGroupId(item.id)}
              style={[
                styles.suggestionRow,
                selectedGroupId === item.id
                  ? { backgroundColor: "#E5E7EB" }
                  : null,
              ]}
            >
              <Text style={styles.suggestionName}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>
          Or create new Item Group
        </Text>
        <TextInput
          placeholder="New Item Group name"
          placeholderTextColor="#9AA0A6"
          value={newGroupName}
          onChangeText={(text) => {
            setNewGroupName(text);
            setSelectedGroupId(null);
          }}
          style={styles.input}
        />

        {!!newGroupName.trim() && (
          <PressableScale
            onPress={async () => {
              const id = await handleCreateNewGroup();
              if (id) Alert.alert("Item Group created!");
            }}
          >
            <View
              style={[
                styles.primaryButton,
                { marginTop: 8, backgroundColor: "#3B82F6" },
              ]}
            >
              <Text style={styles.primaryButtonText}>Create Item Group</Text>
            </View>
          </PressableScale>
        )}
      </View>

      <PressableScale onPress={handleAddItem}>
        <View style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Submit</Text>
        </View>
      </PressableScale>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.cancelButton}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Powered by OpenFoodFacts</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={Header}
          keyExtractor={() => "x"}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    padding: 16,
    paddingBottom: 50,
  },
  scanWrap: {
    marginBottom: 16,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    color: "#111827",
  },
  clearBtn: {
    paddingLeft: 6,
  },
  suggestLoading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  suggestLoadingText: {
    marginLeft: 6,
    color: "#6B7280",
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  suggestionsBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    overflow: "hidden",
  },
  suggestionRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  suggestionName: {
    fontSize: 16,
    color: "#111827",
  },
  suggestionBrand: {
    fontSize: 14,
    color: "#6B7280",
  },
  pickerShell: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    overflow: "hidden",
    height: 44,
    justifyContent: "center",
  },

  picker: {
    height: 56,
    width: "100%",
    color: "#111827",
    fontSize: 16,
  },

  qtyInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  metaText: {
    fontSize: 14,
    color: "#6B7280",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  secondaryButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#111827",
  },
  primaryButton: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginBottom: 16,
  },
  cancelText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 12,
  },
});

export default AddItem;
