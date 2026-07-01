import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import type { AkaziApplicationDto } from "@umuturanyi/shared";
import {
  useAkazi,
  useAkaziApplications,
  useApplyToAkazi,
  useSetAkaziApplicationStatus,
  useToggleAkaziBookmark,
} from "@/lib/hooks";
import { useAuth } from "@/store/auth";
import { api, ApiError } from "@/lib/api";
import { Avatar, AgaciroBadge, Button } from "@/components/ui";
import { palette, radius, spacing } from "@/theme";
import { formatPay, timeAgo } from "@/lib/format";

const APPLICATION_LABEL: Record<AkaziApplicationDto["status"], string> = {
  submitted: "Wasabye",
  shortlisted: "Wari ku rutonde",
  accepted: "Wemewe",
  declined: "Byanze",
  withdrawn: "Wikuyemo",
};

export default function AkaziDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useAkazi(id);
  const user = useAuth((s) => s.user);
  const toggleBookmark = useToggleAkaziBookmark();
  const apply = useApplyToAkazi();
  const [applyOpen, setApplyOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const isOwner = data ? user?.id === data.akazi.poster.id : false;
  const applications = useAkaziApplications(id, isOwner);

  if (isLoading || !data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.orange} size="large" />
      </View>
    );
  }

  const a = data.akazi;
  const isJob = a.kind === "job";
  const alreadyApplied = a.myApplicationStatus != null;

  async function submitApplication() {
    setError(null);
    try {
      await apply.mutateAsync({ id, message: message.trim() });
      setApplyOpen(false);
      setMessage("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Habaye ikibazo");
    }
  }

  async function startChat() {
    if (isOwner) return;
    setStarting(true);
    try {
      const res = await api.post<{ conversationId: string }>("/messages/conversations", {
        recipientId: a.poster.id,
        body: `Muraho, ku byerekeye "${a.title}"…`,
      });
      router.push(`/ubutumwa/${res.conversationId}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </Pressable>
        <Pressable
          onPress={() => toggleBookmark.mutate({ id: a.id, bookmarked: a.isBookmarked })}
          hitSlop={10}
        >
          <Ionicons
            name={a.isBookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color={a.isBookmarked ? palette.orange : palette.textSecondary}
          />
        </Pressable>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.body}>
          <View style={styles.tagRow}>
            <View style={[styles.kindTag, { backgroundColor: isJob ? palette.green : palette.orange }]}>
              <Text style={styles.kindText}>{isJob ? "Akazi" : "Serivisi"}</Text>
            </View>
            {a.isRemote ? (
              <View style={styles.remoteTag}>
                <Ionicons name="globe-outline" size={12} color={palette.sky} />
                <Text style={styles.remoteText}>Kure</Text>
              </View>
            ) : null}
            {a.status !== "open" ? <Text style={styles.closedText}>Byafunzwe</Text> : null}
          </View>

          <Text style={styles.title}>{a.title}</Text>
          {a.images.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageStrip}
            >
              {a.images.map((img) => (
                <Image key={img.id} source={{ uri: img.url }} style={styles.image} contentFit="cover" transition={150} />
              ))}
            </ScrollView>
          ) : null}
          <Text style={styles.meta}>
            {a.category.rw} · {a.neighborhood.name} · {timeAgo(a.createdAt)}
          </Text>
          <Text style={styles.pay}>{formatPay(a.payMin, a.payMax, a.payPeriod)}</Text>
          {a.description ? <Text style={styles.description}>{a.description}</Text> : null}
          <Text style={styles.stats}>
            Abarebye {a.viewCount} · Basabye {a.applicationCount} · Babitse {a.bookmarkCount}
          </Text>
        </View>

        <View style={styles.divider} />

        <Pressable style={styles.poster}>
          <Avatar name={a.poster.displayName} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.posterName}>{a.poster.displayName}</Text>
            <Text style={styles.posterMeta}>{a.poster.neighborhood?.name ?? a.neighborhood.name}</Text>
          </View>
          <AgaciroBadge score={a.poster.agaciro} />
        </Pressable>

        {isOwner ? (
          <View style={styles.applicants}>
            <Text style={styles.applicantsTitle}>Abasabye ({a.applicationCount})</Text>
            {applications.data?.applications.length ? (
              applications.data.applications.map((app) => <ApplicantRow key={app.id} app={app} />)
            ) : (
              <Text style={styles.applicantsEmpty}>Nta wasabye akazi kugeza ubu.</Text>
            )}
          </View>
        ) : null}
      </ScrollView>

      {!isOwner ? (
        <SafeAreaView style={styles.actionBar} edges={["bottom"]}>
          {applyOpen ? (
            <View style={{ flex: 1, gap: spacing.sm }}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Andika ubutumwa bugufi ku watanze iri tangazo…"
                placeholderTextColor={palette.textFaint}
                style={styles.applyInput}
                multiline
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Button title="Reka" variant="outline" size="md" style={{ flex: 1 }} onPress={() => setApplyOpen(false)} />
                <Button
                  title="Ohereza"
                  size="md"
                  style={{ flex: 1.4 }}
                  loading={apply.isPending}
                  disabled={message.trim().length === 0}
                  onPress={submitApplication}
                />
              </View>
            </View>
          ) : (
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
              {alreadyApplied ? (
                <View style={styles.appliedPill}>
                  <Ionicons name="checkmark-circle" size={18} color={palette.green} />
                  <Text style={styles.appliedText}>{APPLICATION_LABEL[a.myApplicationStatus!]}</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.applyBtn, a.status !== "open" && { opacity: 0.5 }]}
                  disabled={a.status !== "open"}
                  onPress={() => setApplyOpen(true)}
                >
                  <Text style={styles.applyText}>{isJob ? "Saba aka kazi" : "Saba serivisi"}</Text>
                </Pressable>
              )}
            </>
          )}
        </SafeAreaView>
      ) : null}
    </View>
  );
}

function ApplicantRow({ app }: { app: AkaziApplicationDto }) {
  const setStatus = useSetAkaziApplicationStatus();
  const decided = app.status === "accepted" || app.status === "declined" || app.status === "withdrawn";
  return (
    <View style={styles.applicantRow}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Avatar name={app.applicant.displayName} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.applicantName}>{app.applicant.displayName}</Text>
          <Text style={styles.applicantStatus}>{APPLICATION_LABEL[app.status]}</Text>
        </View>
        <AgaciroBadge score={app.applicant.agaciro} />
      </View>
      {app.message ? <Text style={styles.applicantMessage}>{app.message}</Text> : null}
      {!decided ? (
        <View style={styles.applicantActions}>
          {app.status !== "shortlisted" ? (
            <Button
              title="Ku rutonde"
              variant="outline"
              size="md"
              style={{ flex: 1 }}
              loading={setStatus.isPending}
              onPress={() => setStatus.mutate({ applicationId: app.id, status: "shortlisted" })}
            />
          ) : null}
          <Button
            title="Wanze"
            variant="outline"
            size="md"
            style={{ flex: 1 }}
            onPress={() => setStatus.mutate({ applicationId: app.id, status: "declined" })}
          />
          <Button
            title="Emera"
            size="md"
            style={{ flex: 1.2 }}
            onPress={() => setStatus.mutate({ applicationId: app.id, status: "accepted" })}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.bg },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  tagRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  kindTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.xl },
  kindText: { color: palette.white, fontWeight: "800", fontSize: 11 },
  remoteTag: { flexDirection: "row", alignItems: "center", gap: 3 },
  remoteText: { color: palette.sky, fontWeight: "700", fontSize: 12 },
  closedText: { color: palette.textFaint, fontWeight: "700", fontSize: 12 },
  title: { fontWeight: "800", fontSize: 22, color: palette.ink, lineHeight: 28 },
  imageStrip: { gap: spacing.sm, paddingTop: spacing.md },
  image: { width: 220, height: 150, borderRadius: radius.lg, backgroundColor: palette.surfaceAlt },
  meta: { fontSize: 13, color: palette.textMuted, marginTop: 6 },
  pay: { fontWeight: "800", fontSize: 22, color: palette.ink, marginTop: spacing.md },
  description: { fontSize: 15, lineHeight: 23, color: palette.textSecondary, marginTop: spacing.lg },
  stats: { fontSize: 12.5, color: palette.textFaint, marginTop: spacing.lg },
  divider: { height: 1, backgroundColor: palette.border, marginHorizontal: spacing.lg, marginVertical: spacing.md },
  poster: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  posterName: { fontWeight: "700", fontSize: 15, color: palette.textPrimary },
  posterMeta: { fontSize: 12.5, color: palette.textMuted, marginTop: 2 },
  applicants: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  applicantsTitle: { fontWeight: "800", fontSize: 16, color: palette.ink },
  applicantsEmpty: { fontSize: 13.5, color: palette.textMuted },
  applicantRow: {
    backgroundColor: palette.bgWarm,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  applicantName: { fontWeight: "700", fontSize: 14.5, color: palette.textPrimary },
  applicantStatus: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
  applicantMessage: { fontSize: 13.5, lineHeight: 20, color: palette.textSecondary },
  applicantActions: { flexDirection: "row", gap: spacing.sm },
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
  applyBtn: {
    flex: 1.3,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: palette.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: { fontWeight: "700", fontSize: 15, color: palette.white },
  appliedPill: {
    flex: 1.3,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: palette.greenSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  appliedText: { fontWeight: "700", fontSize: 14.5, color: palette.green },
  applyInput: {
    minHeight: 60,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    fontSize: 14.5,
    color: palette.textPrimary,
    textAlignVertical: "top",
  },
  error: { color: palette.danger, fontSize: 13, fontWeight: "600" },
});
