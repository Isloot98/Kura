import "react-native-reanimated";
import "react-native-url-polyfill/auto";

import React, { useEffect, useState } from "react";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";

import { supabase } from "./lib/supabase";

import Auth from "./components/Auth";
import Logo from "./components/Logo";

import PantryScreen from "./screens/PantryScreen";
import RecipesScreen from "./screens/RecipesScreen";
import ShoppingListScreen from "./screens/ShoppingListScreen";

import AddItemScreen from "./screens/AddItem";
import AddShoppingListScreen from "./screens/AddShoppingList";
import EditShoppingListScreen from "./screens/EditShoppingListScreen";
import AddRecipeScreen from "./screens/AddRecipeScreen";
import EditRecipeScreen from "./screens/EditRecipeScreen";
import BarcodeScannerScreen from "./screens/BarcodeScannerScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navigationRef = createNavigationContainerRef();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setBooting(false);
    };
    void init();
  }, []);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  const SignOutButton = () => (
    <TouchableOpacity
      onPress={() => void supabase.auth.signOut()}
      style={{ marginRight: 10, flexDirection: "row", alignItems: "center" }}
    >
      <Ionicons name="log-out-outline" size={18} color="#fff" />
      <Text style={{ color: "#fff", marginLeft: 6, fontWeight: "bold" }}>
        Sign Out
      </Text>
    </TouchableOpacity>
  );

  const common = {
    headerStyle: { backgroundColor: "#1976D2" },
    headerTitleAlign: "center" as const,
  };

  const Tabs = () => (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { height: 85 },
        headerStyle: { backgroundColor: "#1976D2", height: 110 },
        headerTitle: "",
        headerRight: () => <SignOutButton />,
        headerLeft: () => <Logo size={100} />,
        headerLeftContainerStyle: { paddingLeft: 10, paddingBottom: 10 },
      }}
    >
      <Tab.Screen
        name="Pantry"
        component={PantryScreen}
        options={{ tabBarIcon: () => <Text>🍞</Text> }}
      />
      <Tab.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{ tabBarIcon: () => <Text>🥘</Text> }}
      />
      <Tab.Screen
        name="Shopping List"
        component={ShoppingListScreen}
        options={{ tabBarIcon: () => <Text>🛒</Text> }}
      />
    </Tab.Navigator>
  );

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={common}>
        {!session && (
          <Stack.Screen
            name="Auth"
            component={Auth}
            options={{ title: "Log in" }}
          />
        )}

        {session && (
          <>
            <Stack.Screen
              name="MainTabs"
              component={Tabs}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="AddItem"
              component={AddItemScreen}
              options={{ title: "Add Pantry Item" }}
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
