import "react-native-reanimated";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"; // Import Tab Navigator
import "react-native-url-polyfill/auto";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./components/Auth";
import PantryScreen from "./screens/PantryScreen";
import RecipesScreen from "./screens/RecipesScreen";
import ShoppingListScreen from "./screens/ShoppingListScreen";
import { View, Text, StyleSheet, Button } from "react-native";
import { Session } from "@supabase/supabase-js";
import AddItemScreen from "./screens/AddItem";
import AddShoppingListScreen from "./screens/AddShoppingList";
import EditShoppingListScreen from "./screens/EditShoppingListScreen";
import AddRecipeScreen from "./screens/AddRecipeScreen";
import EditRecipeScreen from "./screens/EditRecipeScreen";
import BarcodeScannerScreen from "./screens/BarcodeScannerScreen";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Ensure expo install @expo/vector-icons
import {
  useFonts,
  HachiMaruPop_400Regular,
} from "@expo-google-fonts/hachi-maru-pop";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator(); // Create Tab Navigator

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Check session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const [fontsLoaded] = useFonts({
    HachiMaruPop_400Regular,
  });

  if (!fontsLoaded) return null;

  const SignOutButton = () => (
    <TouchableOpacity
      onPress={() => supabase.auth.signOut()}
      style={{
        marginRight: 10,
        backgroundColor: "#fff",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Ionicons name="log-out-outline" size={18} color="#f4511e" />
      <Text style={{ color: "#f4511e", marginLeft: 6, fontWeight: "bold" }}>
        Sign Out
      </Text>
    </TouchableOpacity>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: "#fcba03", // Example: you can change background if needed
          },
          headerTitleAlign: "center",
          // Optional: to center the header title
        }}
      >
        {/* Auth Screen for Unauthenticated Users */}
        {!session || !session.user ? (
          <Stack.Screen name="Auth" component={Auth} />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              options={{ headerShown: false }} // Hide header for the tab navigation
            >
              {() => (
                <Tab.Navigator
                
                  screenOptions={{
                    tabBarStyle: {
                      height: 85,
                    },
                    headerStyle: {
                      backgroundColor: "#f4511e",
                      height: 110,
                    },
                    headerTitleStyle: {
                      fontWeight: "bold",
                      paddingTop: 40,
                    },
                    headerRight: () => <SignOutButton />, // Set it once here
                    headerRightContainerStyle: {
                      paddingRight: 10,
                      paddingBottom: 10,
                    },
                    headerLeftContainerStyle: {
                      paddingLeft: 10,
                      paddingTop: 20,
                    },
                    headerLeft: () => (
                      <View style={{ position: "absolute", left: 10, top: -5 }}>
                        <Text
                          style={{
                            fontFamily: "HachiMaruPop_400Regular",
                            fontSize: 26,
                            color: "#fff",
                            includeFontPadding: false,
                          }}
                        >
                          Kura
                        </Text>
                      </View>
                    ),
                  }}
                >
                  {/* Define Tab Screens */}
                  <Tab.Screen
                    name="Pantry"
                    component={PantryScreen}
                    options={{
                      tabBarIcon: () => <Text>🍞</Text>, // Example icon
                      headerTitle: "",
                    }}
                  />
                  <Tab.Screen
                    name="Recipes"
                    component={RecipesScreen}
                    options={{
                      tabBarIcon: () => <Text>🥘</Text>, // Example icon
                      headerTitle: "",
                    }}
                  />
                  <Tab.Screen
                    name="Shopping List"
                    component={ShoppingListScreen}
                    options={{
                      tabBarIcon: () => <Text>🛒</Text>, // Example icon
                      headerTitle: "",
                    }}
                  />
                </Tab.Navigator>
              )}
            </Stack.Screen>
            <Stack.Screen name="AddItem" component={AddItemScreen} />
            <Stack.Screen
              name="BarcodeScanner"
              component={BarcodeScannerScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddShoppingList"
              component={AddShoppingListScreen}
            />
            <Stack.Screen
              name="EditShoppingList"
              component={EditShoppingListScreen}
              options={{ title: "Edit Shopping List" }}
            />
            <Stack.Screen
              name="AddRecipeScreen"
              component={AddRecipeScreen}
              options={{ title: "Add Recipe" }}
            />
            <Stack.Screen
              name="EditRecipeScreen"
              component={EditRecipeScreen}
              options={{ title: "Edit Recipe" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({});
