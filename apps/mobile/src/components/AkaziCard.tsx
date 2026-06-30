import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { AkaziDto } from "@umuturanyi/shared";
import { palette, radius, spacing } from "../theme";
import { formatPay, timeAgo } from "../lib/format";

/** A single Akazi (job/service) row on the board. */
export function AkaziCard({ akazi }: { akazi: AkaziDto }) {
  const isJob = akazi.kind === "job";
  return (
    <Pressable
      onPress={() => router.push(`/akazi/${akazi.id}`)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.icon, { backgroundColor: isJob ? palette.greenSoft : palette.orangeSoft }]}>
        <Text style={{ fontSize: 28 }}>{akazi.category.icon}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.topLine}>
          <View style={[styles.kindTag, { backgroundColor: isJob ? palette.green : palette.orange }]}>
            <Text style={styles.kindText}>{isJob ? "Akazi" : "Serivisi"}</Text>
          </View>
          {akazi.isRemote ? (
            <View style={styles.remoteTag}>
              <Ionicons name="globe-outline" size={11} color={palette.sky} />
              <Text style={styles.remoteText}>Kure</Text>
            </View>
          ) : null}
          {akazi.status !== "open" ? <Text style={styles.closedText}>Byafunzwe</Text> : null}
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {akazi.title}
        </Text>
        <Text style={styles.meta}>
          {akazi.category.rw} · {akazi.neighborhood.name} · {timeAgo(akazi.createdAt)}
          {akazi.distanceKm != null ? ` · ${akazi.distanceKm} km` : ""}
        </Text>
        <Text style={styles.pay}>{formatPay(akazi.payMin, akazi.payMax, akazi.payPeriod)}</Text>
      </View>
    </Pressable>
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
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, paddingTop: 2 },
  topLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 4 },
  kindTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.xl },
  kindText: { color: palette.white, fontWeight: "800", fontSize: 10.5 },
  remoteTag: { flexDirection: "row", alignItems: "center", gap: 3 },
  remoteText: { color: palette.sky, fontWeight: "700", fontSize: 11 },
  closedText: { color: palette.textFaint, fontWeight: "700", fontSize: 11 },
  title: { fontSize: 15.5, fontWeight: "600", color: palette.textPrimary, lineHeight: 20 },
  meta: { fontSize: 12.5, fontWeight: "500", color: palette.textMuted, marginTop: 4 },
  pay: { fontSize: 15, fontWeight: "800", color: palette.textPrimary, marginTop: 6 },
});
