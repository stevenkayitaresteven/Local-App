import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ListingDto } from "@umuturanyi/shared";
import { useListings } from "@/lib/hooks";
import { useAuth } from "@/store/auth";
import { ListingCard } from "@/components/ListingCard";
import { EmptyState, Skeleton } from "@/components/ui";
import { palette, spacing } from "@/theme";

/**
 * "Ikarita" — nearby view. A native map (react-native-maps) drops in here for
 * device builds; on web and in this build we present a distance-ranked list,
 * which shares the same /listings?sort=nearby endpoint.
 */
export default function Ikarita() {
  const user = useAuth((s) => s.user);
  const filters = useMemo(
    () => ({ sort: "nearby" as const, neighborhood: user?.neighborhood?.slug }),
    [user?.neighborhood?.slug],
  );
  const { data, isLoading } = useListings(filters);
  const listings: ListingDto[] = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Ionicons name="location" size={20} color={palette.orange} />
        <Text style={styles.title}>Hafi ya {user?.neighborhood?.name ?? "Kigali"}</Text>
      </View>
      <View style={styles.mapBanner}>
        <Text style={{ fontSize: 40 }}>🗺️</Text>
        <Text style={styles.mapText}>Ibicuruzwa biri hafi yawe, bihereye ku ntera</Text>
      </View>
      <FlatList
        data={listings}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 96 }}
        ListEmptyComponent={
          isLoading ? (
            <Skeleton />
          ) : (
            <EmptyState emoji="📍" title="Nta bicuruzwa biri hafi" subtitle="Gerageza ahandi cyangwa ongera ugerageze" />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontWeight: "800", fontSize: 19, color: palette.ink },
  mapBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: palette.greenSoft,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  mapText: { flex: 1, color: palette.textSecondary, fontWeight: "600", fontSize: 13.5 },
});
