import React, { useEffect, useState } from "react";
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
import * as Linking from "expo-linking";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryInfo, setRecoveryInfo] = useState<string | null>(null);

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
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("Enter your email", "Type your email first, then tap reset.");
      return;
    }

    setLoading(true);

    const redirectTo = Linking.createURL("reset-password");
    console.log("resetPassword redirectTo:", redirectTo);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Reset failed", error.message);
      return;
    }

    Alert.alert(
      "Email sent ✅",
      "Open the email on your phone and tap the reset link. The app will detect it and show the reset form.",
    );
  }

  async function submitNewPassword() {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(
        "Password too short",
        "Password must be at least 6 characters.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        console.error("updateUser error:", error);
        Alert.alert(
          "Reset failed",
          error.message || "Could not update password.",
        );
      } else {
        Alert.alert(
          "Success",
          "Password updated. Please sign in with your new password.",
        );
        setNewPassword("");
        setConfirmPassword("");
        setRecoveryMode(false);

        await supabase.auth.signOut();
      }
    } catch (err: any) {
      console.error("submitNewPassword unexpected:", err);
      Alert.alert("Error", err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const parseQuery = (qs: string) =>
      Object.fromEntries(
        qs
          .split("&")
          .filter(Boolean)
          .map((pair) => {
            const [k, v] = pair.split("=");
            return [decodeURIComponent(k), decodeURIComponent(v ?? "")];
          }),
      );

    const handleDeepLink = async (rawUrl: string | null) => {
      if (!rawUrl) return;
      console.log("AUTH: DEEP LINK RAW:", rawUrl);

      try {
        const [beforeHash, hashPart] = rawUrl.split("#");
        const [base, queryPart] = beforeHash.split("?");

        const query = queryPart ? parseQuery(queryPart) : {};
        const fragment = hashPart ? parseQuery(hashPart) : {};

        console.log("AUTH: DEEP LINK PARSED:", { base, query, fragment });

        if (fragment.access_token || fragment.refresh_token) {
          console.log("AUTH: tokens in fragment — calling setSession");
          await supabase.auth.setSession({
            access_token: fragment.access_token,
            refresh_token: fragment.refresh_token,
          });
          const check = await supabase.auth.getSession();
          console.log(
            "AUTH: setSession result session:",
            check.data?.session ? true : false,
          );
          if (query.type === "recovery" || fragment.type === "recovery") {
            setRecoveryMode(true);
            setRecoveryInfo(
              "Detected recovery link — set a new password below.",
            );
          }
          return;
        }

        if (query.access_token || query.refresh_token) {
          console.log("AUTH: tokens in query — calling setSession");
          await supabase.auth.setSession({
            access_token: query.access_token,
            refresh_token: query.refresh_token,
          });
          const check = await supabase.auth.getSession();
          console.log(
            "AUTH: setSession result session:",
            check.data?.session ? true : false,
          );
          if (query.type === "recovery") {
            setRecoveryMode(true);
            setRecoveryInfo(
              "Detected recovery link — set a new password below.",
            );
          }
          return;
        }

        if (query.type === "recovery" || fragment.type === "recovery") {
          const { data } = await supabase.auth.getSession();
          console.log("AUTH: getSession after recovery check", data);
          if (data?.session) {
            setRecoveryMode(true);
            setRecoveryInfo(
              "Detected recovery link — set a new password below.",
            );
          } else {
            setRecoveryMode(true);
            setRecoveryInfo(
              "Recovery link detected, but no session is active. Open the email on this device and tap the link so the app can finish the reset.",
            );
          }
        }
      } catch (err) {
        console.error("AUTH: Error handling deep link:", err);
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

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("AUTH: onAuthStateChange", event);
        if (event === "PASSWORD_RECOVERY") {
          setRecoveryMode(true);
          setRecoveryInfo("Please set a new password");
        }
        if (event === "SIGNED_OUT") {
          setRecoveryMode(false);
          setRecoveryInfo(null);
        }
      },
    );

    return () => subscription?.subscription?.unsubscribe();
  }, []);

  if (recoveryMode) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Logo size={90} />
              <Text style={styles.sub}>Reset your password</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
              />

              {!!recoveryInfo && (
                <Text style={styles.muted}>{recoveryInfo}</Text>
              )}

              <TouchableOpacity
                onPress={submitNewPassword}
                disabled={loading}
                activeOpacity={0.9}
                style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              >
                {loading ? (
                  <ActivityIndicator />
                ) : (
                  <>
                    <Ionicons name="key-outline" size={18} color="#fff" />
                    <Text style={styles.primaryText}>Set new password</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setRecoveryMode(false);
                  setRecoveryInfo(null);
                  setNewPassword("");
                  setConfirmPassword("");
                  await supabase.auth.signOut();
                }}
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footer}>Powered by Supabase</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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

  muted: {
    marginTop: 8,
    color: "#6B7280",
    fontSize: 13,
  },
});
