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
import * as Linking from "expo-linking";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [mustResetPassword, setMustResetPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === "PASSWORD_RECOVERY") {
        setMustResetPassword(true);
      }

      if (event === "SIGNED_OUT") {
        setMustResetPassword(false);
      }

      if (event === "SIGNED_IN") {
        setMustResetPassword(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const [fontsLoaded] = useFonts({
    HachiMaruPop_400Regular,
  });

  const linking = {
    prefixes: [Linking.createURL("/"), "kura://"],
    config: {
      screens: {
        ResetPassword: "reset-password",
      },
    },
  };

  // ✅ handle Supabase auth deep links (code or token fragment)
  useEffect(() => {
    const handleUrl = async (url: string) => {
      console.log("INCOMING LINK:", url);

      // 1) PKCE style: kura://reset-password?code=...
      const parsed = Linking.parse(url);
      if (parsed.path === "reset-password") {
        setMustResetPassword(true);
      }
      const code = parsed.queryParams?.code;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          String(code),
        );
        if (error) console.log("exchangeCodeForSession error:", error.message);
        return;
      }

      // 2) Implicit style: kura://reset-password#access_token=...&refresh_token=...
      const fragment = url.split("#")[1];
      if (fragment) {
        const params = Object.fromEntries(new URLSearchParams(fragment));
        if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: String(params.access_token),
            refresh_token: String(params.refresh_token),
          });
          if (error) console.log("setSession error:", error.message);
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

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

  const commonStackScreenOptions = {
    headerStyle: { backgroundColor: "#fcba03" },
    headerTitleAlign: "center" as const,
  };

  const AuthStack = () => (
    <Stack.Navigator screenOptions={commonStackScreenOptions}>
      <Stack.Screen
        name="Auth"
        component={Auth}
        options={{ title: "Log in" }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: "Reset password" }}
      />
    </Stack.Navigator>
  );

  const AppStack = () => (
    <Stack.Navigator screenOptions={commonStackScreenOptions}>
      <Stack.Screen name="Home" options={{ headerShown: false }}>
        {() => (
          <Tab.Navigator
            screenOptions={{
              tabBarStyle: { height: 85 },
              headerStyle: { backgroundColor: "#f4511e", height: 110 },
              headerTitle: "",
              headerRight: () => <SignOutButton />,
              headerRightContainerStyle: { paddingRight: 10 },
              headerLeft: () => <Logo size={100} />,
              headerLeftContainerStyle: { paddingLeft: 10, paddingBottom: 10 },
            }}
          >
            <Tab.Screen
              name="Pantry"
              component={PantryScreen}
              options={{ tabBarIcon: () => <Text>🍞</Text>, headerTitle: "" }}
            />
            <Tab.Screen
              name="Recipes"
              component={RecipesScreen}
              options={{ tabBarIcon: () => <Text>🥘</Text>, headerTitle: "" }}
            />
            <Tab.Screen
              name="Shopping List"
              component={ShoppingListScreen}
              options={{ tabBarIcon: () => <Text>🛒</Text>, headerTitle: "" }}
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

      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: "Reset password" }}
      />
    </Stack.Navigator>
  );

  if (!fontsLoaded) return null;

  if (mustResetPassword) {
    return (
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={commonStackScreenOptions}>
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: "Reset password" }}
          />
          <Stack.Screen
            name="Auth"
            component={Auth}
            options={{ title: "Log in" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {!session || !session.user ? <AuthStack /> : <AppStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({});
