import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ListingDto, Paginated } from "@umuturanyi/shared";
import { api } from "@/lib/api";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState } from "@/components/ui";
import { palette, radius, spacing } from "@/theme";

export default function Search() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ListingDto[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    api.get<{ popular: string[] }>("/search/popular", undefined, false).then((r) => setPopular(r.popular)).catch(() => {});
  }, []);

  async function run(q: string) {
    setTerm(q);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const res = await api.get<Paginated<ListingDto>>("/search", { q, limit: 20 }, false);
    setResults(res.items);
    setSearched(true);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.searchBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </Pressable>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={palette.textMuted} />
          <TextInput
            autoFocus
            value={term}
            onChangeText={run}
            placeholder="Shakisha ibyo ushaka…"
            placeholderTextColor={palette.textFaint}
            style={styles.input}
            returnKeyType="search"
          />
        </View>
      </View>

      {!searched ? (
        <View style={styles.popular}>
          <Text style={styles.popularLabel}>Ibyashakishijwe cyane</Text>
          <View style={styles.tags}>
            {popular.length === 0 ? (
              <Text style={styles.hint}>Andika ijambo kugira ushakishe</Text>
            ) : (
              popular.map((p) => (
                <Pressable key={p} style={styles.tag} onPress={() => run(p)}>
                  <Text style={styles.tagText}>{p}</Text>
                </Pressable>
              ))
            )}
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => <ListingCard listing={item} />}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          ListEmptyComponent={<EmptyState emoji="🔍" title="Nta gisubizo" subtitle={`Nta bicuruzwa bihuye na "${term}"`} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  input: { flex: 1, fontSize: 15, color: palette.textPrimary },
  popular: { padding: spacing.lg },
  popularLabel: { fontWeight: "700", fontSize: 13, color: palette.textMuted, marginBottom: spacing.md },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tag: { backgroundColor: palette.surfaceMuted, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.xl },
  tagText: { fontWeight: "600", fontSize: 13, color: palette.textSecondary },
  hint: { color: palette.textFaint, fontSize: 14 },
});
