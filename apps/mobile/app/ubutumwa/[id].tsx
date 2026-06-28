import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import type { MessageDto } from "@umuturanyi/shared";
import { useMessages } from "@/lib/hooks";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { palette, radius, spacing } from "@/theme";

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const { data, refetch } = useMessages(id);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [draft, setDraft] = useState("");
  const [theyTyping, setTheyTyping] = useState(false);
  const listRef = useRef<FlatList<MessageDto>>(null);

  useEffect(() => {
    if (data?.items) setMessages(data.items);
  }, [data?.items]);

  // Live updates: join the conversation room and react to new messages, typing,
  // and read receipts pushed by the realtime gateway.
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit("conversation:join", id);
    socket.emit("message:read", id);

    const onNew = (m: MessageDto) => {
      if (m.conversationId !== id) return;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.senderId !== user?.id) socket.emit("message:read", id);
    };
    const onTyping = (p: { conversationId: string; userId: string; typing: boolean }) => {
      if (p.conversationId === id && p.userId !== user?.id) setTheyTyping(p.typing);
    };

    socket.on("message:new", onNew);
    socket.on("typing", onTyping);
    return () => {
      socket.emit("conversation:leave", id);
      socket.off("message:new", onNew);
      socket.off("typing", onTyping);
    };
  }, [id, user?.id]);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    getSocket().emit("typing", { conversationId: id, typing: false });
    try {
      const res = await api.post<{ message: MessageDto }>(`/messages/conversations/${id}/messages`, { body });
      setMessages((prev) => (prev.some((x) => x.id === res.message.id) ? prev : [...prev, res.message]));
    } catch {
      void refetch();
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={palette.ink} />
        </Pressable>
        <Text style={styles.headerName}>{data?.conversation.counterpart.displayName ?? "Ikiganiro"}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          renderItem={({ item }) => <Bubble message={item} mine={item.senderId === user?.id} />}
        />
        {theyTyping ? <Text style={styles.typing}>arandika…</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              getSocket().emit("typing", { conversationId: id, typing: t.length > 0 });
            }}
            placeholder="Andika ubutumwa…"
            placeholderTextColor={palette.textFaint}
            style={styles.input}
            multiline
          />
          <Pressable style={styles.sendBtn} onPress={send}>
            <Ionicons name="arrow-up" size={20} color={palette.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message, mine }: { message: MessageDto; mine: boolean }) {
  return (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <Text style={[styles.bubbleText, mine && { color: palette.white }]}>{message.body}</Text>
      {mine && message.readAt ? <Text style={styles.read}>Byasomwe</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerName: { fontWeight: "700", fontSize: 16, color: palette.ink },
  bubble: { maxWidth: "78%", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: palette.orange, borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: palette.surfaceMuted, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20, color: palette.textPrimary },
  read: { fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 3, textAlign: "right" },
  typing: { paddingHorizontal: spacing.lg, color: palette.textMuted, fontStyle: "italic", fontSize: 12, marginBottom: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.xl,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    fontSize: 15,
    color: palette.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.orange,
    alignItems: "center",
    justifyContent: "center",
  },
});
