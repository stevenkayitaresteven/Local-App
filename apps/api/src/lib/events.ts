import { EventEmitter } from "node:events";

/**
 * In-process domain event bus. Modules emit facts ("a message was sent", "a
 * listing was favorited"); subscribers (notifications, realtime, analytics) react
 * without the producers knowing about them. This keeps modules decoupled and makes
 * it trivial to later forward events to a queue/worker for horizontal scaling.
 */
export interface DomainEvents {
  "message.sent": { conversationId: string; messageId: string; senderId: string; recipientId: string };
  "listing.favorited": { listingId: string; actorId: string; sellerId: string };
  "listing.sold": { listingId: string; sellerId: string; buyerId?: string };
  "post.liked": { postId: string; actorId: string; authorId: string };
  "post.commented": { postId: string; actorId: string; authorId: string; commentId: string };
  "comment.liked": { commentId: string; actorId: string; authorId: string };
  "user.followed": { followerId: string; followingId: string };
  "review.created": { reviewId: string; subjectId: string; authorId: string; rating: number };
  "report.created": { reportId: string; targetType: string; targetId: string };
}

type Handler<K extends keyof DomainEvents> = (payload: DomainEvents[K]) => void | Promise<void>;

class TypedEmitter {
  private emitter = new EventEmitter({ captureRejections: true });

  on<K extends keyof DomainEvents>(event: K, handler: Handler<K>): void {
    this.emitter.on(event, handler as (payload: unknown) => void);
  }

  emit<K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]): void {
    this.emitter.emit(event, payload);
  }
}

export const events = new TypedEmitter();
