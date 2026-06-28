import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { NEIGHBORHOODS } from "@umuturanyi/shared";
import { Button, Chip } from "@/components/ui";
import { Field } from "./login";
import { useAuth } from "@/store/auth";
import { ApiError } from "@/lib/api";
import { palette, spacing } from "@/theme";

export default function Register() {
  const register = useAuth((s) => s.register);
  const [displayName, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [neighborhoodSlug, setNeighborhood] = useState(NEIGHBORHOODS[0].slug);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await register({ displayName: displayName.trim(), phone: phone.trim(), password, neighborhoodSlug });
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
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginTop: spacing.sm }}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </Pressable>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.title}>Iyandikishe</Text>
          <Text style={styles.subtitle}>Ku baturanyi, n'abaturanyi 🧺</Text>

          <View style={styles.form}>
            <Field label="Amazina yawe" value={displayName} onChangeText={setName} placeholder="Mukamana Aline" />
            <Field
              label="Nimero ya telefoni"
              value={phone}
              onChangeText={setPhone}
              placeholder="07XX XXX XXX"
              keyboardType="phone-pad"
            />
            <Field
              label="Ijambobanga"
              value={password}
              onChangeText={setPassword}
              placeholder="Nibura inyuguti 8"
              secureTextEntry
            />
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.fieldLabel}>Aho utuye</Text>
              <View style={styles.chips}>
                {NEIGHBORHOODS.map((n) => (
                  <Chip
                    key={n.slug}
                    label={n.name}
                    active={neighborhoodSlug === n.slug}
                    onPress={() => setNeighborhood(n.slug)}
                  />
                ))}
              </View>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Kora konti" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: spacing.xl },
  title: { fontSize: 28, fontWeight: "800", color: palette.ink, marginTop: spacing.lg },
  subtitle: { fontSize: 15, color: palette.textMuted, marginTop: 4 },
  form: { marginTop: spacing.xl, gap: spacing.lg },
  fieldLabel: { fontWeight: "600", fontSize: 13, color: palette.textSecondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, rowGap: spacing.sm },
  error: { color: palette.danger, fontSize: 13, fontWeight: "600" },
});
