import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ListingDto, SortOption } from "@umuturanyi/shared";
import { useCategories, useListings } from "@/lib/hooks";
import { useAuth } from "@/store/auth";
import { ListingCard } from "@/components/ListingCard";
import { Chip, EmptyState, Skeleton } from "@/components/ui";
import { palette, radius, spacing, shadow } from "@/theme";

export default function Home() {
  const user = useAuth((s) => s.user);
  const { data: cats } = useCategories();
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<SortOption>("recent");

  const filters = useMemo(
    () => ({ category, sort, neighborhood: user?.neighborhood?.slug }),
    [category, sort, user?.neighborhood?.slug],
  );
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useListings(filters);

  const listings: ListingDto[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.location} onPress={() => router.push("/(tabs)/ikarita")}>
          <Ionicons name="location" size={18} color={palette.orange} />
          <Text style={styles.locationName}>{user?.neighborhood?.name ?? "Kigali"}</Text>
          <Ionicons name="chevron-down" size={16} color={palette.ink} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/search")} hitSlop={8}>
            <Ionicons name="search" size={22} color={palette.ink} />
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/umuryango")} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={palette.ink} />
          </Pressable>
        </View>
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ slug: undefined, rw: "Byose" }, ...(cats?.categories ?? [])]}
          keyExtractor={(c) => c.slug ?? "all"}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => (
            <Chip label={item.rw} active={category === item.slug} onPress={() => setCategory(item.slug)} />
          )}
        />
      </View>

      <FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 96 }}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <View style={styles.sortRow}>
            <SortPill label="Vuba aha" value="recent" active={sort} onPress={setSort} />
            <SortPill label="Hafi yawe" value="nearby" active={sort} onPress={setSort} />
            <SortPill label="Bikunzwe" value="popular" active={sort} onPress={setSort} />
            <SortPill label="Igiciro" value="price_asc" active={sort} onPress={setSort} />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: spacing.lg, paddingTop: spacing.lg }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} />
              ))}
            </View>
          ) : (
            <EmptyState emoji="🧺" title="Nta bicuruzwa birahari" subtitle="Ba uwa mbere utangiza igicuruzwa mu mudugudu wawe" />
          )
        }
        ListFooterComponent={isFetchingNextPage ? <Skeleton height={80} style={{ marginTop: spacing.lg }} /> : null}
      />

      <Pressable style={[styles.fab, shadow.fab]} onPress={() => router.push("/sell")}>
        <Ionicons name="add" size={20} color={palette.white} />
        <Text style={styles.fabText}>Gurisha</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function SortPill({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: SortOption;
  active: SortOption;
  onPress: (v: SortOption) => void;
}) {
  const on = active === value;
  return (
    <Pressable onPress={() => onPress(value)} style={[styles.sortPill, on && { backgroundColor: palette.orangeSoft }]}>
      <Text style={[styles.sortText, on && { color: palette.orangeDark }]}>{label}</Text>
    </Pressable>
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
  },
  location: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationName: { fontWeight: "800", fontSize: 21, color: palette.ink },
  headerActions: { flexDirection: "row", gap: spacing.lg },
  filterRow: { paddingBottom: spacing.md },
  sortRow: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md },
  sortPill: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: radius.xl, backgroundColor: palette.surfaceMuted },
  sortText: { fontWeight: "600", fontSize: 12.5, color: palette.textSecondary },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.orange,
    paddingHorizontal: 19,
    paddingVertical: 13,
    borderRadius: radius.pill,
  },
  fabText: { color: palette.white, fontWeight: "700", fontSize: 15 },
});
