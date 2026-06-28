import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/store/auth";
import { palette } from "@/theme";

export default function Index() {
  const status = useAuth((s) => s.status);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bgWarm }}>
        <ActivityIndicator color={palette.orange} size="large" />
      </View>
    );
  }
  return <Redirect href={status === "authenticated" ? "/(tabs)" : "/(auth)/welcome"} />;
}
