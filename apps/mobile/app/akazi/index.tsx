import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { AkaziDto, AkaziKind, AkaziSort } from "@umuturanyi/shared";
import { useAkaziBoard, useAkaziCategories } from "@/lib/hooks";
import { useAuth } from "@/store/auth";
import { AkaziCard } from "@/components/AkaziCard";
import { Chip, EmptyState, Skeleton } from "@/components/ui";
import { palette, radius, spacing, shadow } from "@/theme";

export default function AkaziBoard() {
  const user = useAuth((s) => s.user);
  const { data: cats } = useAkaziCategories();
  const [kind, setKind] = useState<AkaziKind | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<AkaziSort>("recent");

  const filters = useMemo(
    () => ({ kind, category, sort, neighborhood: user?.neighborhood?.slug }),
    [kind, category, sort, user?.neighborhood?.slug],
  );
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useAkaziBoard(filters);

  const items: AkaziDto[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Akazi & Serivisi</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.segment}>
        <SegBtn label="Byose" active={kind === undefined} onPress={() => setKind(undefined)} />
        <SegBtn label="Akazi" active={kind === "job"} onPress={() => setKind("job")} />
        <SegBtn label="Serivisi" active={kind === "service"} onPress={() => setKind("service")} />
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ slug: undefined, rw: "Ibyiciro byose" }, ...(cats?.categories ?? [])]}
          keyExtractor={(c) => c.slug ?? "all"}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => (
            <Chip label={item.rw} active={category === item.slug} onPress={() => setCategory(item.slug)} />
          )}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <AkaziCard akazi={item} />}
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
            <SortPill label="Igiciro" value="pay_high" active={sort} onPress={setSort} />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: spacing.lg, paddingTop: spacing.lg }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={88} />
              ))}
            </View>
          ) : (
            <EmptyState
              emoji="🛠️"
              title="Nta tangazo rirahari"
              subtitle="Ba uwa mbere utanga akazi cyangwa serivisi mu mudugudu wawe"
            />
          )
        }
        ListFooterComponent={isFetchingNextPage ? <Skeleton height={80} style={{ marginTop: spacing.lg }} /> : null}
      />

      <Pressable style={[styles.fab, shadow.fab]} onPress={() => router.push("/akazi/new")}>
        <Ionicons name="add" size={20} color={palette.white} />
        <Text style={styles.fabText}>Tangaza</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.segBtn, active && styles.segBtnActive]}>
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SortPill({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value: AkaziSort;
  active: AkaziSort;
  onPress: (v: AkaziSort) => void;
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
  headerTitle: { fontWeight: "800", fontSize: 18, color: palette.ink },
  segment: {
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
  },
  segBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.sm },
  segBtnActive: { backgroundColor: palette.white, ...shadow.card },
  segText: { fontWeight: "700", fontSize: 13.5, color: palette.textMuted },
  segTextActive: { color: palette.ink },
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
