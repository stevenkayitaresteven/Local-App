import React, { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api, ApiError } from "@/lib/api";
import { palette, radius, spacing } from "../theme";

interface UploadedImage {
  id: string;
  url: string;
}

/**
 * Pick images from the library and upload them to the API, surfacing the
 * resulting image ids through `onChange` so a form can attach them on submit.
 * Self-contained: manages its own upload state and previews, works on web and
 * native. Reused by the Sell and Akazi create screens.
 */
export function PhotoPicker({
  max = 6,
  onChange,
  label = "Ongeraho amafoto",
}: {
  max?: number;
  onChange: (imageIds: string[]) => void;
  label?: string;
}) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function commit(next: UploadedImage[]): void {
    setImages(next);
    onChange(next.map((i) => i.id));
  }

  async function add(): Promise<void> {
    setError(null);
    const remaining = max - images.length;
    if (remaining <= 0 || busy) return;

    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError("Twemerere kugera ku mafoto kugira ngo uzohereze.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;

    setBusy(true);
    try {
      const uploaded: UploadedImage[] = [];
      for (const asset of result.assets.slice(0, remaining)) {
        const image = await api.uploadImage({
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        uploaded.push({ id: image.id, url: image.url });
      }
      commit([...images, ...uploaded]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ifoto ntiyoherejwe. Ongera ugerageze.");
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string): void {
    commit(images.filter((i) => i.id !== id));
  }

  const canAdd = images.length < max;

  return (
    <View style={{ gap: spacing.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {images.map((img) => (
          <View key={img.id} style={styles.thumb}>
            <Image source={{ uri: img.url }} style={styles.thumbImg} contentFit="cover" transition={150} />
            <Pressable style={styles.removeBtn} onPress={() => remove(img.id)} hitSlop={8}>
              <Ionicons name="close" size={14} color={palette.white} />
            </Pressable>
          </View>
        ))}

        {canAdd ? (
          <Pressable
            style={[styles.addTile, images.length === 0 && styles.addTileWide]}
            onPress={add}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            {busy ? (
              <ActivityIndicator color={palette.textMuted} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={26} color={palette.textMuted} />
                <Text style={styles.addText}>
                  {label}
                  {images.length > 0 ? ` (${images.length}/${max})` : ""}
                </Text>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const TILE = 104;

const styles = StyleSheet.create({
  strip: { gap: spacing.sm, paddingRight: spacing.sm },
  thumb: {
    width: TILE,
    height: TILE,
    borderRadius: radius.lg,
    backgroundColor: palette.surfaceAlt,
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(33,28,22,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: palette.borderStrong,
    backgroundColor: palette.bgWarm,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  addTileWide: { width: "100%", minWidth: 240, flexGrow: 1 },
  addText: { color: palette.textMuted, fontWeight: "600", fontSize: 12, textAlign: "center" },
  error: { color: palette.danger, fontSize: 13, fontWeight: "600" },
});
