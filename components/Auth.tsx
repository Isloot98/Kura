import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import Logo from "./Logo";
import { Ionicons } from "@expo/vector-icons";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) Alert.alert("Sign in failed", error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) Alert.alert("Sign up failed", error.message);
    if (!session)
      Alert.alert("Check your inbox", "Verify your email to continue.");
    setLoading(false);
  }

  async function resetPassword() {
    if (!email.trim()) {
      Alert.alert("Enter your email", "Type your email first, then tap reset.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "kura://reset-password",
    });

    setLoading(false);

    if (error) {
      Alert.alert("Reset failed", error.message);
      return;
    }

    Alert.alert(
      "Email sent ✅",
      "Open the email on your phone and tap the reset link.",
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Logo size={90} />
            <Text style={styles.title}>Kura</Text>
            <Text style={styles.sub}>
              Log in to manage your pantry, recipes, and lists.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              onChangeText={setEmail}
              value={email}
              placeholder="email@address.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              onChangeText={setPassword}
              value={password}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={signInWithEmail}
              disabled={loading}
              activeOpacity={0.9}
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            >
              {loading ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={styles.primaryText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={signUpWithEmail}
              disabled={loading}
              activeOpacity={0.9}
              style={[styles.secondaryBtn, loading && { opacity: 0.6 }]}
            >
              <Ionicons name="person-add-outline" size={18} color="#111827" />
              <Text style={styles.secondaryText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={resetPassword}
              disabled={loading}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>Powered by Supabase</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 20, justifyContent: "center" },

  header: { alignItems: "center", marginBottom: 14 },
  title: { marginTop: 10, fontSize: 24, fontWeight: "900", color: "#111827" },
  sub: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 320,
  },

  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  label: {
    marginTop: 10,
    marginBottom: 6,
    fontWeight: "900",
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  secondaryBtn: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryText: { color: "#111827", fontWeight: "900", fontSize: 16 },

  linkBtn: { marginTop: 12, alignItems: "center" },
  linkText: { color: "#6B7280", fontWeight: "900" },

  footer: {
    marginTop: 10,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "700",
  },
});
