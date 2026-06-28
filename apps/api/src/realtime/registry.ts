import type { Server as IOServer } from "socket.io";

/**
 * A thin indirection between domain code and Socket.IO. Services call
 * `realtime.toUser(...)` without importing the socket server, and it safely
 * no-ops when realtime isn't attached (unit tests, worker processes).
 *
 * Presence is tracked by counting a user's live socket connections.
 */
class RealtimeRegistry {
  private io: IOServer | null = null;
  private connections = new Map<string, number>();

  attach(io: IOServer): void {
    this.io = io;
  }

  userRoom(userId: string): string {
    return `user:${userId}`;
  }

  conversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  toUser(userId: string, event: string, payload: unknown): void {
    this.io?.to(this.userRoom(userId)).emit(event, payload);
  }

  toConversation(conversationId: string, event: string, payload: unknown): void {
    this.io?.to(this.conversationRoom(conversationId)).emit(event, payload);
  }

  markOnline(userId: string): boolean {
    const next = (this.connections.get(userId) ?? 0) + 1;
    this.connections.set(userId, next);
    return next === 1; // became online
  }

  markOffline(userId: string): boolean {
    const next = (this.connections.get(userId) ?? 1) - 1;
    if (next <= 0) {
      this.connections.delete(userId);
      return true; // became offline
    }
    this.connections.set(userId, next);
    return false;
  }

  isOnline(userId: string): boolean {
    return (this.connections.get(userId) ?? 0) > 0;
  }
}

export const realtime = new RealtimeRegistry();
