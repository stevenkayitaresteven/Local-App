import { describe, it, expect } from "vitest";
import { api, auth, registerUser, createListing } from "./helpers.js";

describe("favorites", () => {
  it("favorites and unfavorites a listing and notifies the seller", async () => {
    const seller = await registerUser();
    const buyer = await registerUser();
    const listing = await createListing(seller.token);

    const fav = await api().put(`/api/v1/listings/${listing.id}/favorite`).set(auth(buyer.token));
    expect(fav.status).toBe(200);
    expect(fav.body.favorited).toBe(true);
    expect(fav.body.favoriteCount).toBe(1);

    const list = await api().get("/api/v1/me/favorites").set(auth(buyer.token));
    expect(list.body.listings).toHaveLength(1);

    // The seller should receive a notification (emitted asynchronously).
    await new Promise((r) => setTimeout(r, 50));
    const notifs = await api().get("/api/v1/notifications").set(auth(seller.token));
    expect(notifs.body.items.some((n: { type: string }) => n.type === "listing_favorited")).toBe(true);

    const unfav = await api().delete(`/api/v1/listings/${listing.id}/favorite`).set(auth(buyer.token));
    expect(unfav.body.favorited).toBe(false);
    expect(unfav.body.favoriteCount).toBe(0);
  });
});

describe("community", () => {
  it("creates a post, likes it, and comments", async () => {
    const author = await registerUser();
    const reader = await registerUser();

    const post = await api()
      .post("/api/v1/community/posts")
      .set(auth(author.token))
      .send({ body: "Umuganda kuwa gatandatu!", topicSlug: "umuganda", neighborhoodSlug: "kimironko" });
    expect(post.status).toBe(201);

    const like = await api().put(`/api/v1/community/posts/${post.body.post.id}/like`).set(auth(reader.token));
    expect(like.body.liked).toBe(true);
    expect(like.body.likeCount).toBe(1);

    const comment = await api()
      .post(`/api/v1/community/posts/${post.body.post.id}/comments`)
      .set(auth(reader.token))
      .send({ body: "Ndaza!" });
    expect(comment.status).toBe(201);

    const comments = await api().get(`/api/v1/community/posts/${post.body.post.id}/comments`);
    expect(comments.body.comments).toHaveLength(1);
    expect(comments.body.comments[0].body).toBe("Ndaza!");
  });
});

describe("messaging", () => {
  it("starts a conversation, exchanges messages, and tracks unread + read", async () => {
    const seller = await registerUser();
    const buyer = await registerUser();
    const listing = await createListing(seller.token);

    const start = await api()
      .post("/api/v1/messages/conversations")
      .set(auth(buyer.token))
      .send({ recipientId: seller.id, listingId: listing.id, body: "Iracyahari?" });
    expect(start.status).toBe(201);
    const conversationId = start.body.conversationId;

    // Seller has 1 unread.
    const unread = await api().get("/api/v1/messages/unread-count").set(auth(seller.token));
    expect(unread.body.unread).toBe(1);

    // Seller replies.
    const reply = await api()
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set(auth(seller.token))
      .send({ body: "Yego iracyahari" });
    expect(reply.status).toBe(201);

    // Seller reads → unread resets.
    await api().post(`/api/v1/messages/conversations/${conversationId}/read`).set(auth(seller.token));
    const afterRead = await api().get("/api/v1/messages/unread-count").set(auth(seller.token));
    expect(afterRead.body.unread).toBe(0);

    const thread = await api()
      .get(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set(auth(buyer.token));
    expect(thread.body.items.length).toBe(2);
  });

  it("prevents messaging a user who blocked you", async () => {
    const a = await registerUser();
    const b = await registerUser();
    await api().put(`/api/v1/users/${a.id}/block`).set(auth(b.token));

    const res = await api()
      .post("/api/v1/messages/conversations")
      .set(auth(a.token))
      .send({ recipientId: b.id, body: "hi" });
    expect(res.status).toBe(403);
  });
});

describe("reviews & trust", () => {
  it("records a review and updates the subject's Agaciro and rating", async () => {
    const seller = await registerUser();
    const buyer = await registerUser();

    const before = await api().get(`/api/v1/users/${seller.id}`);
    const res = await api()
      .post("/api/v1/users/reviews")
      .set(auth(buyer.token))
      .send({ subjectId: seller.id, rating: 5, comment: "Umuntu mwiza" });
    expect(res.status).toBe(201);

    await new Promise((r) => setTimeout(r, 50));
    const after = await api().get(`/api/v1/users/${seller.id}`);
    expect(after.body.profile.ratingCount).toBe(1);
    expect(after.body.profile.ratingAverage).toBe(5);
    expect(after.body.profile.agaciro).toBeGreaterThanOrEqual(before.body.profile.agaciro);
  });

  it("forbids reviewing yourself", async () => {
    const me = await registerUser();
    const res = await api()
      .post("/api/v1/users/reviews")
      .set(auth(me.token))
      .send({ subjectId: me.id, rating: 5 });
    expect(res.status).toBe(400);
  });
});
