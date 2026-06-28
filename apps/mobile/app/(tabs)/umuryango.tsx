import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { COMMUNITY_TOPICS, type PostDto } from "@umuturanyi/shared";
import { usePosts } from "@/lib/hooks";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { Chip, EmptyState, Skeleton } from "@/components/ui";
import { palette, spacing, radius, shadow } from "@/theme";

export default function Community() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [topic, setTopic] = useState<string | undefined>(undefined);
  const filters = { neighborhood: user?.neighborhood?.slug, topic };
  const { data, isLoading, fetchNextPage, hasNextPage, refetch, isRefetching } = usePosts(filters);
  const posts: PostDto[] = data?.pages.flatMap((p) => p.items) ?? [];

  async function like(post: PostDto) {
    await api.put(`/community/posts/${post.id}/like`).catch(() => {});
    void qc.invalidateQueries({ queryKey: ["posts"] });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Umuryango</Text>
        <Ionicons name="notifications-outline" size={22} color={palette.ink} />
      </View>

      <View style={styles.tabs}>
        {["Umudugudu", "Amatsinda", "Ibimina"].map((t, i) => (
          <Text key={t} style={[styles.tab, i === 0 && styles.tabActive]}>
            {t}
          </Text>
        ))}
      </View>

      <View style={styles.chipRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ slug: undefined, rw: "Byose" }, ...COMMUNITY_TOPICS]}
          keyExtractor={(t) => t.slug ?? "all"}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => (
            <Chip label={item.rw} active={topic === item.slug} onPress={() => setTopic(item.slug)} />
          )}
        />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PostCard post={item} onLike={() => like(item)} />}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 96 }}
        onEndReached={() => hasNextPage && fetchNextPage()}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: spacing.lg, paddingTop: spacing.lg }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={120} />
              ))}
            </View>
          ) : (
            <EmptyState emoji="🗣️" title="Nta nkuru irahari" subtitle="Tangiza ikiganiro mu mudugudu wawe" />
          )
        }
      />

      <Pressable style={[styles.fab, shadow.fab]}>
        <Ionicons name="create-outline" size={18} color={palette.white} />
        <Text style={styles.fabText}>Andika</Text>
      </Pressable>
    </SafeAreaView>
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
  title: { fontWeight: "800", fontSize: 21, color: palette.ink },
  tabs: { flexDirection: "row", gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  tab: { fontWeight: "600", fontSize: 16, color: palette.textFaint },
  tabActive: { color: palette.ink, fontWeight: "800" },
  chipRow: { paddingBottom: spacing.md },
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
