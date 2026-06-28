import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useListing, useToggleFavorite } from "@/lib/hooks";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import { Avatar, AgaciroBadge } from "@/components/ui";
import { palette, radius, spacing } from "@/theme";
import { formatFrw, timeAgo } from "@/lib/format";

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { data, isLoading } = useListing(id);
  const toggleFav = useToggleFavorite();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [starting, setStarting] = useState(false);

  if (isLoading || !data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.orange} size="large" />
      </View>
    );
  }

  const l = data.listing;
  const cover = l.images[0]?.url;
  const isOwner = user?.id === l.seller.id;

  async function startChat() {
    if (isOwner) return;
    setStarting(true);
    try {
      const res = await api.post<{ conversationId: string }>("/messages/conversations", {
        recipientId: l.seller.id,
        listingId: l.id,
        body: `Muraho, "${l.title}" iracyahari?`,
      });
      router.push(`/ubutumwa/${res.conversationId}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={[styles.hero, { height: width }]}>
          {cover ? (
            <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Text style={{ fontSize: 130 }}>{l.category.icon}</Text>
          )}
          <SafeAreaView style={styles.heroNav} edges={["top"]}>
            <RoundButton icon="chevron-back" onPress={() => router.back()} />
          </SafeAreaView>
        </View>

        <Pressable style={styles.seller} onPress={() => {}}>
          <Avatar name={l.seller.displayName} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sellerName}>{l.seller.displayName}</Text>
            <Text style={styles.sellerMeta}>
              {l.seller.neighborhood?.name ?? l.neighborhood.name}
            </Text>
          </View>
          <AgaciroBadge score={l.seller.agaciro} />
        </Pressable>

        <View style={styles.divider} />

        <View style={styles.body}>
          <Text style={styles.title}>{l.title}</Text>
          <Text style={styles.meta}>
            {l.category.rw} · {timeAgo(l.createdAt)}
          </Text>
          <Text style={[styles.price, l.isFree && { color: palette.green }]}>{formatFrw(l.price)}</Text>
          {l.isNegotiable && !l.isFree ? <Text style={styles.negotiable}>Birashoboka kuganira ku giciro</Text> : null}
          {l.description ? <Text style={styles.description}>{l.description}</Text> : null}
          <Text style={styles.viewers}>
            Abarebye {l.viewCount} · Bakunze {l.favoriteCount}
          </Text>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.actionBar} edges={["bottom"]}>
        <Pressable
          style={styles.favBtn}
          onPress={() => {
            toggleFav.mutate({ id: l.id, favorited: l.isFavorited });
            void qc.invalidateQueries({ queryKey: ["listing", id] });
          }}
        >
          <Ionicons
            name={l.isFavorited ? "heart" : "heart-outline"}
            size={24}
            color={l.isFavorited ? palette.orange : palette.textSecondary}
          />
        </Pressable>
        {!isOwner ? (
          <>
            <Pressable style={styles.chatBtn} onPress={startChat} disabled={starting}>
              {starting ? (
                <ActivityIndicator color={palette.ink} />
              ) : (
                <>
                  <Ionicons name="chatbubble-outline" size={18} color={palette.ink} />
                  <Text style={styles.chatText}>Vugana</Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.buyBtn}>
              <Text style={styles.buyText}>Gura ubu</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.buyBtn}>
            <Text style={styles.buyText}>Hindura igicuruzwa</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

function RoundButton({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.roundBtn}>
      <Ionicons name={icon} size={22} color={palette.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg },
  hero: { backgroundColor: palette.surfaceAlt, alignItems: "center", justifyContent: "center" },
  heroNav: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: spacing.lg },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  seller: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  sellerName: { fontWeight: "700", fontSize: 15, color: palette.textPrimary },
  sellerMeta: { fontSize: 12.5, color: palette.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: palette.border, marginHorizontal: spacing.lg },
  body: { padding: spacing.lg },
  title: { fontWeight: "700", fontSize: 21, color: palette.ink },
  meta: { fontSize: 12.5, color: palette.textMuted, marginTop: 5 },
  price: { fontWeight: "800", fontSize: 26, color: palette.ink, marginTop: spacing.md },
  negotiable: { fontSize: 13, color: palette.green, fontWeight: "600", marginTop: 4 },
  description: { fontSize: 15, lineHeight: 23, color: palette.textSecondary, marginTop: spacing.lg },
  viewers: { fontSize: 12.5, color: palette.textFaint, marginTop: spacing.lg },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  favBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  chatText: { fontWeight: "700", fontSize: 15, color: palette.ink },
  buyBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: palette.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  buyText: { fontWeight: "700", fontSize: 15, color: palette.white },
});
