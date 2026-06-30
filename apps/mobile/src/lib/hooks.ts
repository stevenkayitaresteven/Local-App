import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ListingDto,
  AkaziDto,
  AkaziApplicationDto,
  PostDto,
  CommentDto,
  ConversationDto,
  MessageDto,
  NotificationDto,
  Paginated,
  ListingQuery,
  AkaziQuery,
} from "@umuturanyi/shared";
import { api } from "./api";

interface AkaziCategory {
  slug: string;
  rw: string;
  en: string;
  icon: string;
}

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

// ── Akazi (local jobs & services) ───────────────────────────────────────────────
type AkaziFilters = Partial<Pick<AkaziQuery, "q" | "kind" | "category" | "employment" | "neighborhood" | "remoteOnly" | "sort">>;

export function useAkaziCategories() {
  return useQuery({
    queryKey: ["akazi-categories"],
    queryFn: () => api.get<{ categories: AkaziCategory[] }>("/akazi-categories", undefined, false),
    staleTime: Infinity,
  });
}

export function useAkaziBoard(filters: AkaziFilters) {
  return useInfiniteQuery({
    queryKey: ["akazi", filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Paginated<AkaziDto>>("/akazi", { ...filters, cursor: pageParam, limit: 20 }, false),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useAkazi(id: string) {
  return useQuery({
    queryKey: ["akazi-post", id],
    queryFn: () => api.get<{ akazi: AkaziDto }>(`/akazi/${id}`),
    enabled: Boolean(id),
  });
}

export function useToggleAkaziBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, bookmarked }: { id: string; bookmarked: boolean }) =>
      bookmarked
        ? api.del<{ bookmarkCount: number }>(`/akazi/${id}/bookmark`)
        : api.put<{ bookmarkCount: number }>(`/akazi/${id}/bookmark`),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["akazi"] });
      void qc.invalidateQueries({ queryKey: ["akazi-post", vars.id] });
      void qc.invalidateQueries({ queryKey: ["akazi-bookmarks"] });
    },
  });
}

export function useApplyToAkazi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      api.post<{ application: AkaziApplicationDto }>(`/akazi/${id}/apply`, { message }),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["akazi-post", vars.id] });
      void qc.invalidateQueries({ queryKey: ["akazi-applications-mine"] });
    },
  });
}

export function useMyAkaziApplications() {
  return useQuery({
    queryKey: ["akazi-applications-mine"],
    queryFn: () => api.get<{ applications: AkaziApplicationDto[] }>("/akazi/applications/mine"),
  });
}

export function useAkaziApplications(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["akazi-applications", id],
    queryFn: () => api.get<{ applications: AkaziApplicationDto[] }>(`/akazi/${id}/applications`),
    enabled: Boolean(id) && enabled,
  });
}

export function useSetAkaziApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: AkaziApplicationDto["status"] }) =>
      api.post<{ application: AkaziApplicationDto }>(`/akazi/applications/${applicationId}/status`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["akazi-applications"] });
      void qc.invalidateQueries({ queryKey: ["akazi-applications-mine"] });
    },
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
