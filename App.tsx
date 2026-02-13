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
import * as Linking from "expo-linking";

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

import ResetPasswordScreen from "./screens/ResetPasswordScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navigationRef = createNavigationContainerRef();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [mustResetPassword, setMustResetPassword] = useState(false);
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
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AUTH EVENT:", event);

      setSession(session);

      if (event === "PASSWORD_RECOVERY") {
        setMustResetPassword(true);
      }

      if (event === "SIGNED_OUT") {
        setMustResetPassword(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const parseQuery = (qs: string) => {
      return Object.fromEntries(
        qs
          .split("&")
          .filter(Boolean)
          .map((pair) => {
            const [k, v] = pair.split("=");
            return [decodeURIComponent(k), decodeURIComponent(v ?? "")];
          }),
      );
    };

    const handleDeepLink = async (rawUrl: string | null) => {
      if (!rawUrl) return;
      console.log("DEEP LINK RAW:", rawUrl);

      try {
        const [beforeHash, hashPart] = rawUrl.split("#");
        const [base, queryPart] = beforeHash.split("?");

        const query = queryPart ? parseQuery(queryPart) : {};
        const fragment = hashPart ? parseQuery(hashPart) : {};

        console.log("DEEP LINK PARSED:", { base, query, fragment });

        if (fragment.access_token || fragment.refresh_token) {
          console.log(
            "Found tokens in fragment — calling supabase.auth.setSession",
          );
          const setRes = await supabase.auth.setSession({
            access_token: fragment.access_token,
            refresh_token: fragment.refresh_token,
          });
          console.log("setSession result:", setRes);
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
          return;
        }

        if (query.access_token || query.refresh_token) {
          console.log(
            "Found tokens in query — calling supabase.auth.setSession",
          );
          const setRes = await supabase.auth.setSession({
            access_token: query.access_token,
            refresh_token: query.refresh_token,
          });
          console.log("setSession result:", setRes);
          const { data } = await supabase.auth.getSession();
          setSession(data.session);
          return;
        }

        if (query.code) {
          console.log(
            "Found code in query — attempting exchangeCodeForSession",
          );
          try {
            const { data, error } =
              await supabase.auth.exchangeCodeForSession(rawUrl);
            console.log("exchangeCodeForSession result", { data, error });
            if (error) {
              console.error("exchangeCodeForSession error:", error);
            } else if (data?.session) {
              setSession(data.session);
            }
          } catch (e) {
            console.error("exchangeCodeForSession threw:", e);
          }
          return;
        }

        if (query.error || fragment.error) {
          console.warn("Deep link contains error param", { query, fragment });
        } else {
          console.log("Deep link contained no tokens/code — parsed values:", {
            query,
            fragment,
          });
        }
      } catch (err) {
        console.error("Error in handleDeepLink:", err);
      }
    };

    void Linking.getInitialURL()
      .then(handleDeepLink)
      .catch((e) => console.error(e));

    const sub = Linking.addEventListener("url", ({ url }) =>
      handleDeepLink(url),
    );
    return () => sub.remove();
  }, []);

  const linking = {
    prefixes: [Linking.createURL("/"), "kura://"],
    config: {
      screens: {
        ResetPassword: "reset-password",
      },
    },
  };

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
    headerStyle: { backgroundColor: "#fcba03" },
    headerTitleAlign: "center" as const,
  };

  const Tabs = () => (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { height: 85 },
        headerStyle: { backgroundColor: "#f4511e", height: 110 },
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

  if (booting) return null;

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
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

            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{
                title: "Reset password",
                headerBackVisible: false,
                gestureEnabled: false,
                headerLeft: () => null,
                headerRight: () => null,
              }}
              initialParams={{
                onDone: async () => {
                  try {
                    await supabase.auth.signOut();
                  } catch (err) {
                    console.error(
                      "Error signing out after password reset:",
                      err,
                    );
                  } finally {
                    setSession(null);
                    setMustResetPassword(false);
                  }
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
