import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import type { ConversationDto } from "@umuturanyi/shared";
import { useConversations } from "@/lib/hooks";
import { Avatar, EmptyState, Skeleton } from "@/components/ui";
import { palette, radius, spacing } from "@/theme";
import { timeAgo } from "@/lib/format";

export default function Chats() {
  const { data, isLoading, refetch, isRefetching } = useConversations();
  const conversations = data?.conversations ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>Ubutumwa</Text>
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ConversationRow conversation={item} />}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg, paddingTop: spacing.lg }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={64} />
              ))}
            </View>
          ) : (
            <EmptyState emoji="💬" title="Nta biganiro" subtitle="Vugana n'abacuruzi kugira utangire ikiganiro" />
          )
        }
      />
    </SafeAreaView>
  );
}

function ConversationRow({ conversation }: { conversation: ConversationDto }) {
  const cover = conversation.listing?.images[0]?.url;
  return (
    <Pressable
      onPress={() => router.push(`/ubutumwa/${conversation.id}`)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: palette.surfaceMuted }]}
    >
      <Avatar name={conversation.counterpart.displayName} size={48} />
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.name}>{conversation.counterpart.displayName}</Text>
          <Text style={styles.time}>{conversation.lastMessage ? timeAgo(conversation.lastMessage.createdAt) : ""}</Text>
        </View>
        <Text numberOfLines={1} style={styles.preview}>
          {conversation.lastMessage?.body || (conversation.lastMessage?.image ? "📷 Ifoto" : "…")}
        </Text>
      </View>
      {cover ? <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" /> : null}
      {conversation.unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{conversation.unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  title: { fontWeight: "800", fontSize: 21, color: palette.ink, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontWeight: "700", fontSize: 15, color: palette.textPrimary },
  time: { fontSize: 12, color: palette.textFaint },
  preview: { fontSize: 13.5, color: palette.textMuted, marginTop: 2 },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: palette.surfaceAlt },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: palette.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: palette.white, fontWeight: "700", fontSize: 11 },
});
