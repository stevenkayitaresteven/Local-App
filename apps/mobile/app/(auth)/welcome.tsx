import React from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { palette, spacing, radius } from "@/theme";

export default function Welcome() {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#FFF4E8", "#FDE6CC", "#F8D6AF"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Umuturanyi wawe wo kwizerwa</Text>
          <Text style={styles.headline}>
            GURA.{"\n"}
            <Text style={{ color: palette.orange }}>GURISHA.</Text>
            {"\n"}UHUZE.
          </Text>

          <ImageBackground
            style={styles.poster}
            imageStyle={{ borderRadius: radius.xl }}
            source={undefined}
          >
            <LinearGradient colors={["#FFE6CA", "#F4C79C"]} style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]} />
            <Text style={{ fontSize: 120 }}>🧺</Text>
            <View style={styles.tagOrange}>
              <Text style={styles.tagOrangeText}>Hafi yawe ✦</Text>
            </View>
            <View style={styles.tagGreen}>
              <Text style={styles.tagGreenText}>5,000 Frw</Text>
            </View>
          </ImageBackground>
        </View>

        <View style={styles.footer}>
          <Logo size={26} />
          <Text style={styles.sub}>
            Isoko ry'umudugudu n'umuryango wa Rwanda — gura ugurishe hafi yawe, ubonane n'abaturanyi.
          </Text>
          <Button title="Tangira" onPress={() => router.push("/(auth)/register")} />
          <Button title="Nfite konti" variant="ghost" onPress={() => router.push("/(auth)/login")} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: "space-between", paddingVertical: spacing.lg },
  hero: { alignItems: "center", marginTop: spacing.xl },
  kicker: { fontWeight: "700", fontSize: 15, color: palette.orangeDark, marginBottom: spacing.sm },
  headline: { fontWeight: "900", fontSize: 52, lineHeight: 50, color: palette.ink, textAlign: "center" },
  poster: {
    width: "100%",
    height: 320,
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tagOrange: {
    position: "absolute",
    top: 22,
    left: 18,
    backgroundColor: palette.orange,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.xl,
    transform: [{ rotate: "-7deg" }],
  },
  tagOrangeText: { color: palette.white, fontWeight: "800", fontSize: 13 },
  tagGreen: {
    position: "absolute",
    bottom: 70,
    right: 18,
    backgroundColor: palette.green,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    transform: [{ rotate: "6deg" }],
  },
  tagGreenText: { color: palette.white, fontWeight: "800", fontSize: 15 },
  footer: { gap: spacing.sm, alignItems: "center", paddingBottom: spacing.lg },
  sub: {
    textAlign: "center",
    color: palette.textSecondary,
    fontSize: 14.5,
    lineHeight: 21,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});
