import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { palette, radius, spacing, shadow } from "../theme";

// ── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: "md" | "lg";
}

export function Button({ title, variant = "primary", loading, icon, style, size = "lg", disabled, ...rest }: ButtonProps) {
  const v = BUTTON_VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        size === "md" && { height: 44 },
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 1.5 : 0 },
        (disabled || loading) && { opacity: 0.6 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const BUTTON_VARIANTS = {
  primary: { bg: palette.orange, fg: palette.white, border: "" },
  secondary: { bg: palette.ink, fg: palette.white, border: "" },
  ghost: { bg: "transparent", fg: palette.textSecondary, border: "" },
  outline: { bg: palette.white, fg: palette.textPrimary, border: palette.borderStrong },
} as const;

// ── Chip ────────────────────────────────────────────────────────────────────
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? palette.ink : palette.surfaceMuted },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? palette.white : palette.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ children, color = palette.orange, soft }: { children: React.ReactNode; color?: string; soft?: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: soft ? palette.orangeSoft : color }]}>
      <Text style={[styles.badgeText, { color: soft ? palette.orangeDark : palette.white }]}>{children}</Text>
    </View>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 44, uri, color = palette.orange }: { name: string; size?: number; uri?: string | null; color?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={{ color: palette.white, fontWeight: "800", fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

// ── AgaciroBadge (trust pill) ─────────────────────────────────────────────────
export function AgaciroBadge({ score }: { score: number }) {
  const color = score >= 85 ? palette.green : score >= 65 ? palette.sky : score >= 40 ? palette.sun : palette.textFaint;
  return (
    <View style={[styles.agaciro, { borderColor: color }]}>
      <Text style={[styles.agaciroText, { color }]}>Agaciro {score}</Text>
    </View>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, shadow.card, style]}>{children}</View>;
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 52 }}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ height = 104, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height, backgroundColor: palette.surfaceAlt, borderRadius: radius.md }, style]} />;
}

// ── SectionLabel ──────────────────────────────────────────────────────────────
export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  buttonText: { fontWeight: "700", fontSize: 15 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: radius.xl,
    marginRight: spacing.sm,
  },
  chipText: { fontWeight: "600", fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.xl, alignSelf: "flex-start" },
  badgeText: { fontWeight: "800", fontSize: 11 },
  avatar: { alignItems: "center", justifyContent: "center" },
  agaciro: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  agaciroText: { fontWeight: "800", fontSize: 12 },
  card: { backgroundColor: palette.surface, borderRadius: radius.card, padding: spacing.lg },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 64, gap: spacing.sm },
  emptyTitle: { fontWeight: "700", fontSize: 16, color: palette.textPrimary },
  emptySubtitle: { fontWeight: "500", fontSize: 13.5, color: palette.textMuted, textAlign: "center", paddingHorizontal: 40 },
  sectionLabel: {
    fontWeight: "700",
    fontSize: 12,
    color: palette.textMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
