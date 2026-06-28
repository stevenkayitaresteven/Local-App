import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Button } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/store/auth";
import { ApiError } from "@/lib/api";
import { palette, radius, spacing } from "@/theme";

export default function Login() {
  const login = useAuth((s) => s.login);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Habaye ikibazo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </Pressable>
        <View style={styles.header}>
          <Logo size={24} />
          <Text style={styles.title}>Murakaza neza</Text>
          <Text style={styles.subtitle}>Injira kugira ngo ukomeze</Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Nimero ya telefoni cyangwa imeyili"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="07XX XXX XXX"
            keyboardType="default"
            autoCapitalize="none"
          />
          <Field
            label="Ijambobanga"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Injira" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />
          <Pressable onPress={() => router.push("/(auth)/register")} style={styles.switch}>
            <Text style={styles.switchText}>
              Nta konti ufite? <Text style={{ color: palette.orange, fontWeight: "700" }}>Iyandikishe</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.textFaint}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: spacing.xl },
  back: { marginTop: spacing.sm },
  header: { marginTop: spacing.xl, gap: spacing.xs },
  title: { fontSize: 28, fontWeight: "800", color: palette.ink, marginTop: spacing.lg },
  subtitle: { fontSize: 15, color: palette.textMuted },
  form: { marginTop: spacing.xxl, gap: spacing.lg },
  field: { gap: 6 },
  fieldLabel: { fontWeight: "600", fontSize: 13, color: palette.textSecondary },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: palette.textPrimary,
    backgroundColor: palette.white,
  },
  error: { color: palette.danger, fontSize: 13, fontWeight: "600" },
  switch: { alignItems: "center", marginTop: spacing.md },
  switchText: { color: palette.textSecondary, fontSize: 14 },
});
