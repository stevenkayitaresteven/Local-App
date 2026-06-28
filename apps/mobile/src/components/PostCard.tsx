import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PostDto } from "@umuturanyi/shared";
import { palette, radius, spacing } from "../theme";
import { timeAgo } from "../lib/format";
import { Avatar } from "./ui";

export function PostCard({ post, onLike }: { post: PostDto; onLike?: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar name={post.author.displayName} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.author}>{post.author.displayName}</Text>
          <Text style={styles.meta}>
            {post.neighborhood.name} · {timeAgo(post.createdAt)}
          </Text>
        </View>
        <View style={styles.topic}>
          <Text style={styles.topicText}>{post.topic.rw}</Text>
        </View>
      </View>
      <Text style={styles.body}>{post.body}</Text>
      <View style={styles.footer}>
        <Pressable onPress={onLike} style={styles.action} hitSlop={8}>
          <Ionicons
            name={post.isLiked ? "heart" : "heart-outline"}
            size={18}
            color={post.isLiked ? palette.orange : palette.textMuted}
          />
          <Text style={[styles.actionText, post.isLiked && { color: palette.orange }]}>{post.likeCount}</Text>
        </Pressable>
        <View style={styles.action}>
          <Ionicons name="chatbubble-outline" size={17} color={palette.textMuted} />
          <Text style={styles.actionText}>{post.commentCount}</Text>
        </View>
        <View style={[styles.action, { marginLeft: "auto" }]}>
          <Ionicons name="eye-outline" size={16} color={palette.textFaint} />
          <Text style={styles.actionText}>Yarebwe {post.viewCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  author: { fontWeight: "700", fontSize: 14.5, color: palette.textPrimary },
  meta: { fontWeight: "500", fontSize: 12, color: palette.textMuted, marginTop: 1 },
  topic: {
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  topicText: { fontWeight: "600", fontSize: 12, color: palette.textSecondary },
  body: { fontSize: 14.5, lineHeight: 21, color: palette.textPrimary, marginTop: spacing.md },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: spacing.md },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontWeight: "600", fontSize: 13, color: palette.textMuted },
});
