import "react-native-reanimated";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import "react-native-url-polyfill/auto";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Auth from "./components/Auth";
import PantryScreen from "./screens/PantryScreen";
import RecipesScreen from "./screens/RecipesScreen";
import ShoppingListScreen from "./screens/ShoppingListScreen";
import { View, Text, StyleSheet } from "react-native";
import { Session } from "@supabase/supabase-js";
import AddItemScreen from "./screens/AddItem";
import AddShoppingListScreen from "./screens/AddShoppingList";
import EditShoppingListScreen from "./screens/EditShoppingListScreen";
import AddRecipeScreen from "./screens/AddRecipeScreen";
import EditRecipeScreen from "./screens/EditRecipeScreen";
import BarcodeScannerScreen from "./screens/BarcodeScannerScreen";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  HachiMaruPop_400Regular,
} from "@expo-google-fonts/hachi-maru-pop";
import Logo from "./components/Logo";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

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
            backgroundColor: "#fcba03",
          },
          headerTitleAlign: "center",
        }}
      >
        {!session || !session.user ? (
          <Stack.Screen name="Auth" component={Auth} />
        ) : (
          <>
            <Stack.Screen name="Home" options={{ headerShown: false }}>
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

                    headerTitle: "",

                    headerRight: () => <SignOutButton />,
                    headerRightContainerStyle: {
                      paddingRight: 10,
                    },

                    headerLeft: () => <Logo size={100} />,
                    headerLeftContainerStyle: {
                      paddingLeft: 10,
                      paddingBottom: 10,
                    },
                  }}
                >
                  <Tab.Screen
                    name="Pantry"
                    component={PantryScreen}
                    options={{
                      tabBarIcon: () => <Text>🍞</Text>,
                      headerTitle: "",
                    }}
                  />
                  <Tab.Screen
                    name="Recipes"
                    component={RecipesScreen}
                    options={{
                      tabBarIcon: () => <Text>🥘</Text>,
                      headerTitle: "",
                    }}
                  />
                  <Tab.Screen
                    name="Shopping List"
                    component={ShoppingListScreen}
                    options={{
                      tabBarIcon: () => <Text>🛒</Text>,
                      headerTitle: "",
                    }}
                  />
                </Tab.Navigator>
              )}
            </Stack.Screen>

            <Stack.Screen
              name="AddItem"
              component={AddItemScreen}
              options={{ title: "Add pantry item" }}
            />
            <Stack.Screen
              name="BarcodeScanner"
              component={BarcodeScannerScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddShoppingList"
              component={AddShoppingListScreen}
              options={{ title: "Add Shopping List" }}
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
