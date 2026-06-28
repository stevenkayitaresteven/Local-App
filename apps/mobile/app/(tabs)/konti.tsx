import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TRUST_TIER_LABEL, tierForScore } from "@umuturanyi/shared";
import { useAuth } from "@/store/auth";
import { Avatar, Badge } from "@/components/ui";
import { palette, radius, spacing, shadow } from "@/theme";

export default function Konti() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  if (!user) return null;
  const tier = tierForScore(user.agaciro);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Konti yanjye</Text>
          <Ionicons name="settings-outline" size={22} color={palette.ink} />
        </View>

        <View style={styles.profile}>
          <Avatar name={user.displayName} size={64} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.displayName}</Text>
              {user.phoneVerified ? <Badge color={palette.green}>Yemejwe</Badge> : null}
            </View>
            <Text style={styles.sub}>
              {user.neighborhood?.name ?? "Kigali"} · {new Date(user.memberSince).getFullYear()}
            </Text>
          </View>
        </View>

        <View style={[styles.agaciroCard, shadow.card]}>
          <Text style={styles.agaciroLabel}>AGACIRO</Text>
          <View style={styles.agaciroRow}>
            <Text style={styles.agaciroScore}>{user.agaciro}</Text>
            <Text style={styles.agaciroMax}>/ 100</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 30 }}>{tier === "pillar" ? "🏅" : tier === "trusted" ? "🤝" : "🌱"}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${user.agaciro}%` }]} />
          </View>
          <Text style={styles.tierText}>{TRUST_TIER_LABEL[tier].rw}</Text>
        </View>

        <View style={styles.statsRow}>
          <Stat value={user.ratingCount} label="Isuzuma" />
          <Stat value={user.ratingAverage ? user.ratingAverage.toFixed(1) : "—"} label="Inyenyeri" icon="star" />
          <Stat value={user.phoneVerified ? "✓" : "—"} label="Telefoni" />
        </View>

        <View style={styles.menu}>
          <MenuRow icon="pricetag-outline" label="Ibyo ngurisha" />
          <MenuRow icon="heart-outline" label="Ibyo nkunze" />
          <MenuRow icon="wallet-outline" label="Umuturanyi Pay · Ibimina" />
          <MenuRow icon="time-outline" label="Ibyo narebye" />
          <MenuRow icon="shield-checkmark-outline" label="Umutekano n'ibanga" />
        </View>

        <Pressable onPress={logout} style={styles.logout}>
          <Ionicons name="log-out-outline" size={18} color={palette.danger} />
          <Text style={styles.logoutText}>Sohoka</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, icon }: { value: string | number; label: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        {icon ? <Ionicons name={icon} size={16} color={palette.sun} /> : null}
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: palette.surfaceMuted }]}>
      <Ionicons name={icon} size={20} color={palette.textSecondary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
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
    paddingVertical: spacing.md,
  },
  title: { fontWeight: "800", fontSize: 21, color: palette.ink },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontWeight: "800", fontSize: 19, color: palette.ink },
  sub: { fontSize: 13, color: palette.textMuted, marginTop: 3 },
  agaciroCard: { margin: spacing.lg, backgroundColor: palette.white, borderRadius: radius.lg, padding: spacing.lg },
  agaciroLabel: { fontWeight: "700", fontSize: 11, letterSpacing: 1, color: palette.textMuted },
  agaciroRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 6 },
  agaciroScore: { fontWeight: "900", fontSize: 40, color: palette.ink },
  agaciroMax: { fontSize: 15, color: palette.textMuted },
  progressTrack: { height: 8, backgroundColor: palette.surfaceAlt, borderRadius: 4, marginTop: spacing.md, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: palette.orange, borderRadius: 4 },
  tierText: { marginTop: spacing.sm, fontWeight: "700", fontSize: 13, color: palette.green },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    backgroundColor: palette.bgWarm,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontWeight: "800", fontSize: 18, color: palette.ink },
  statLabel: { fontSize: 12, color: palette.textMuted },
  menu: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: palette.textPrimary },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: spacing.xl },
  logoutText: { color: palette.danger, fontWeight: "700", fontSize: 15 },
});
