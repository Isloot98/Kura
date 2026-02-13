import React, { useMemo, useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import Logo from "../components/Logo";
import { Ionicons } from "@expo/vector-icons";

export default function ResetPasswordScreen({ route }) {
  const onDone = route?.params?.onDone;

  console.log("[ResetPasswordScreen] render", {
    hasRoute: !!route,
    routeName: route?.name,
    paramKeys: route?.params ? Object.keys(route.params) : null,
    hasOnDone: typeof onDone === "function",
  });

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("[ResetPasswordScreen] mounted");

    supabase.auth.getSession().then(({ data }) => {
      console.log("[ResetPasswordScreen] getSession result", {
        hasSession: !!data.session,
        userId: data.session?.user?.id,
        email: data.session?.user?.email,
      });

      if (!data.session) {
        Alert.alert(
          "Link expired",
          "Please request a new password reset email and try again.",
          [
            {
              text: "OK",
              onPress: () => {
                if (typeof onDone === "function") onDone();
              },
            },
          ],
        );
      }
    });

    return () => {
      console.log("[ResetPasswordScreen] unmounted");
    };
  }, []);

  const canSubmit = useMemo(() => {
    const ok =
      !!password && !!confirm && password.length >= 6 && password === confirm;
    console.log("[ResetPasswordScreen] canSubmit recalculated", {
      passwordLen: password.length,
      confirmLen: confirm.length,
      matches: password === confirm,
      ok,
    });
    return ok;
  }, [password, confirm]);

  const handleReset = async () => {
    console.log("[ResetPasswordScreen] handleReset pressed", {
      canSubmit,
      loading,
    });

    if (!canSubmit) {
      Alert.alert(
        "Check your password",
        "Passwords must match and be at least 6 characters.",
      );
      return;
    }

    setLoading(true);
    console.log("[ResetPasswordScreen] starting updateUser");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      console.log("[ResetPasswordScreen] updateUser result", {
        ok: !error,
        error: error ? { message: error.message, name: error.name } : null,
      });
      if (error) throw error;

      console.log("[ResetPasswordScreen] signing out…");
      const { error: signOutError } = await supabase.auth.signOut();
      console.log("[ResetPasswordScreen] signOut result", {
        ok: !signOutError,
        error: signOutError
          ? { message: signOutError.message, name: signOutError.name }
          : null,
      });

      setPassword("");
      setConfirm("");

      if (typeof onDone === "function") {
        try {
          onDone();
        } catch (e) {
          console.warn("[ResetPasswordScreen] onDone threw", e);
        }
      }

      Alert.alert("Done ✅", "Your password has been updated.");
    } catch (e) {
      console.log("[ResetPasswordScreen] reset failed (caught)", e);
      Alert.alert("Reset failed", e?.message || "Something went wrong.");
    } finally {
      console.log("[ResetPasswordScreen] handleReset finished");
      setLoading(false);
    }
  };

  const backToLogin = async () => {
    console.log("[ResetPasswordScreen] backToLogin pressed");

    const { error } = await supabase.auth.signOut();
    console.log("[ResetPasswordScreen] signOut (backToLogin) result", {
      ok: !error,
      error: error ? { message: error.message, name: error.name } : null,
    });

    if (typeof onDone === "function") onDone();
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
              editable={!loading}
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
              editable={!loading}
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
              {loading ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Ionicons name="key-outline" size={18} color="#fff" />
                  <Text style={styles.primaryText}>Update password</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={backToLogin} style={styles.linkBtn}>
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
  title: { marginTop: 10, fontSize: 20, fontWeight: "900", color: "#111827" },
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
  primaryBtnDisabled: {
    opacity: 0.6,
  },
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
