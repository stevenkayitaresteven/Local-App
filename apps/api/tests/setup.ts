import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";

/** Wipe all data between tests for deterministic, isolated runs. */
async function reset(): Promise<void> {
  // Order respects FK constraints (children first). SQLite enforces them on cascade.
  const tables = [
    "WalletTransaction",
    "Wallet",
    "Payment",
    "Notification",
    "Message",
    "ConversationParticipant",
    "Conversation",
    "CommentLike",
    "Comment",
    "PostLike",
    "Post",
    "Image",
    "Favorite",
    "RecentlyViewed",
    "Review",
    "Report",
    "Follow",
    "Block",
    "IbiminaMember",
    "Ibimina",
    "SearchQuery",
    "AuditLog",
    "VerificationToken",
    "Session",
    "AkaziApplication",
    "AkaziBookmark",
    "AkaziListing",
    "Listing",
    "User",
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${t}";`);
  }
}

beforeEach(reset);

afterAll(async () => {
  await prisma.$disconnect();
});
