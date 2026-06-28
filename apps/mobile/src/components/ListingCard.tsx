import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ListingDto } from "@umuturanyi/shared";
import { palette, radius, spacing } from "../theme";
import { formatFrw, timeAgo } from "../lib/format";

export function ListingCard({ listing }: { listing: ListingDto }) {
  const cover = listing.images[0]?.url;
  return (
    <Pressable
      onPress={() => router.push(`/isoko/${listing.id}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.thumb}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.thumbImg} contentFit="cover" transition={150} />
        ) : (
          <Text style={{ fontSize: 42 }}>{listing.category.icon}</Text>
        )}
        {listing.status === "sold" && (
          <View style={styles.soldTag}>
            <Text style={styles.soldText}>Cyagurishijwe</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {listing.title}
        </Text>
        <Text style={styles.meta}>
          {listing.neighborhood.name} · {timeAgo(listing.createdAt)}
          {listing.distanceKm != null ? ` · ${listing.distanceKm} km` : ""}
        </Text>
        <Text style={[styles.price, listing.isFree && { color: palette.green }]}>{formatFrw(listing.price)}</Text>
        <View style={styles.stats}>
          {listing.chatCount > 0 && (
            <Stat icon="chatbubble-outline" value={listing.chatCount} />
          )}
          {listing.favoriteCount > 0 && <Stat icon="heart-outline" value={listing.favoriteCount} />}
        </View>
      </View>
    </Pressable>
  );
}

function Stat({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: number }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={14} color={palette.textFaint} />
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  thumb: {
    width: 104,
    height: 104,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  soldTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(33,28,22,0.78)",
    paddingVertical: 4,
    alignItems: "center",
  },
  soldText: { color: palette.white, fontWeight: "700", fontSize: 11 },
  body: { flex: 1, paddingTop: 2 },
  title: { fontSize: 16, fontWeight: "600", color: palette.textPrimary, lineHeight: 21 },
  meta: { fontSize: 12.5, fontWeight: "500", color: palette.textMuted, marginTop: 5 },
  price: { fontSize: 17, fontWeight: "800", color: palette.textPrimary, marginTop: 7 },
  stats: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.md, marginTop: 6 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { color: palette.textFaint, fontWeight: "600", fontSize: 13 },
});
