import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ListingDto,
  PostDto,
  CommentDto,
  ConversationDto,
  MessageDto,
  NotificationDto,
  Paginated,
  ListingQuery,
} from "@umuturanyi/shared";
import { api } from "./api";

// ── Catalog ───────────────────────────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<{ categories: { slug: string; rw: string; en: string; icon: string }[] }>("/categories", undefined, false),
    staleTime: Infinity,
  });
}

export function useNeighborhoods() {
  return useQuery({
    queryKey: ["neighborhoods"],
    queryFn: () => api.get<{ neighborhoods: { slug: string; name: string; district: string }[] }>("/neighborhoods", undefined, false),
    staleTime: Infinity,
  });
}

// ── Marketplace ────────────────────────────────────────────────────────────────
type ListingFilters = Partial<Pick<ListingQuery, "q" | "category" | "neighborhood" | "sort" | "freeOnly">>;

export function useListings(filters: ListingFilters) {
  return useInfiniteQuery({
    queryKey: ["listings", filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Paginated<ListingDto>>("/listings", { ...filters, cursor: pageParam, limit: 20 }, false),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.get<{ listing: ListingDto }>(`/listings/${id}`, undefined, false),
    enabled: Boolean(id),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favorited }: { id: string; favorited: boolean }) =>
      favorited
        ? api.del<{ favoriteCount: number }>(`/listings/${id}/favorite`)
        : api.put<{ favoriteCount: number }>(`/listings/${id}/favorite`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["listings"] });
      void qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get<{ listings: ListingDto[] }>("/me/favorites"),
  });
}

// ── Community ──────────────────────────────────────────────────────────────────
export function usePosts(filters: { neighborhood?: string; topic?: string }) {
  return useInfiniteQuery({
    queryKey: ["posts", filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Paginated<PostDto>>("/community/posts", { ...filters, cursor: pageParam, limit: 20 }, false),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => api.get<{ comments: CommentDto[] }>(`/community/posts/${postId}/comments`, undefined, false),
    enabled: Boolean(postId),
  });
}

// ── Messaging ──────────────────────────────────────────────────────────────────
export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<{ conversations: ConversationDto[] }>("/messages/conversations"),
    refetchInterval: 15_000,
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      api.get<{ conversation: ConversationDto; items: MessageDto[]; nextCursor: string | null }>(
        `/messages/conversations/${conversationId}/messages`,
      ),
    enabled: Boolean(conversationId),
  });
}

// ── Notifications ──────────────────────────────────────────────────────────────
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<Paginated<NotificationDto>>("/notifications", { limit: 30 }),
  });
}

export function useUnreadCounts() {
  return useQuery({
    queryKey: ["unread"],
    queryFn: async () => {
      const [n, m] = await Promise.all([
        api.get<{ unread: number }>("/notifications/unread-count"),
        api.get<{ unread: number }>("/messages/unread-count"),
      ]);
      return { notifications: n.unread, messages: m.unread };
    },
    refetchInterval: 20_000,
  });
}
