import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";
import { Ionicons } from "@expo/vector-icons";

export default function ResetPasswordScreen({ navigation }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!password || !confirm) return false;
    if (password.length < 6) return false;
    if (password !== confirm) return false;
    return true;
  }, [password, confirm]);

  const handleReset = async () => {
    if (!canSubmit) {
      Alert.alert(
        "Check your password",
        "Passwords must match and be at least 6 characters.",
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      Alert.alert("Done ✅", "Your password has been updated.", [
        {
          text: "Back to login",
          onPress: () => navigation.navigate("Auth"),
        },
      ]);
    } catch (e) {
      Alert.alert("Reset failed", e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Logo size={78} />
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.sub}>
              Enter a new password for your Kura account.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />

            <TouchableOpacity
              onPress={handleReset}
              disabled={loading || !canSubmit}
              activeOpacity={0.9}
              style={[
                styles.primaryBtn,
                (loading || !canSubmit) && styles.primaryBtnDisabled,
              ]}
            >
              <Ionicons name="key-outline" size={18} color="#fff" />
              <Text style={styles.primaryText}>
                {loading ? "Updating..." : "Update password"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("Auth")}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Back to login</Text>
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
  title: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
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
    fontWeight: "900",
    color: "#111827",
    marginTop: 10,
    marginBottom: 6,
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
  primaryBtnDisabled: { opacity: 0.5 },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 16 },

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
