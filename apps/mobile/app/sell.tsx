import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { CATEGORIES, type ListingDto } from "@umuturanyi/shared";
import { useAuth } from "@/store/auth";
import { api, ApiError } from "@/lib/api";
import { Button, Chip } from "@/components/ui";
import { PhotoPicker } from "@/components/PhotoPicker";
import { palette, radius, spacing } from "@/theme";

export default function Sell() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [categorySlug, setCategory] = useState(CATEGORIES[0].slug);
  const [imageIds, setImageIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const { listing } = await api.post<{ listing: ListingDto }>("/listings", {
        title: title.trim(),
        description: description.trim(),
        price: isFree ? 0 : Number(price.replace(/\D/g, "")) || 0,
        isFree,
        categorySlug,
        neighborhoodSlug: user?.neighborhood?.slug ?? "kimironko",
        condition: "good",
        imageIds,
      });
      void qc.invalidateQueries({ queryKey: ["listings"] });
      router.replace(`/isoko/${listing.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Habaye ikibazo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={palette.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Gurisha</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, gap: spacing.lg }}>
        <PhotoPicker max={10} onChange={setImageIds} />

        <Field label="Izina ry'igicuruzwa" value={title} onChangeText={setTitle} placeholder="Sofa nini y'abantu 3" />
        <Field
          label="Ibisobanuro"
          value={description}
          onChangeText={setDescription}
          placeholder="Sobanura imimerere n'aho giherereye…"
          multiline
        />

        <View style={styles.freeRow}>
          <Text style={styles.fieldLabel}>Ku buntu</Text>
          <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: palette.green }} />
        </View>

        {!isFree ? (
          <Field
            label="Igiciro (Frw)"
            value={price}
            onChangeText={setPrice}
            placeholder="120000"
            keyboardType="numeric"
          />
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.fieldLabel}>Icyiciro</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c.slug} label={`${c.icon} ${c.rw}`} active={categorySlug === c.slug} onPress={() => setCategory(c.slug)} />
            ))}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Tangaza igicuruzwa" onPress={submit} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.textFaint}
        style={[styles.input, multiline && { height: 110, paddingTop: 12, textAlignVertical: "top" }]}
        multiline={multiline}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerTitle: { fontWeight: "800", fontSize: 17, color: palette.ink },
  fieldLabel: { fontWeight: "600", fontSize: 13, color: palette.textSecondary },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: palette.textPrimary,
    backgroundColor: palette.white,
  },
  freeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, rowGap: spacing.sm },
  error: { color: palette.danger, fontSize: 13, fontWeight: "600" },
});
