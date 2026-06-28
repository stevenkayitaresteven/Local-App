import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette } from "../theme";

/**
 * Wordmark. The basket motif (🧺 "ku baturanyi, n'abaturanyi") stands in for the
 * original icon — an original mark, not derived from any third-party brand.
 */
export function Logo({ size = 26, tint = palette.ink }: { size?: number; tint?: string }) {
  return (
    <View style={styles.row}>
      <Text style={{ fontSize: size * 1.05 }}>🧺</Text>
      <Text style={[styles.word, { fontSize: size, color: tint }]}>Umuturanyi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  word: { fontWeight: "800", letterSpacing: -0.3 },
});
