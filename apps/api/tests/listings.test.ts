import { describe, it, expect } from "vitest";
import { api, auth, registerUser, createListing } from "./helpers.js";

describe("listings", () => {
  it("creates and fetches a listing", async () => {
    const seller = await registerUser();
    const listing = await createListing(seller.token, { title: "Igikoni table", price: 65000 });
    expect(listing.title).toBe("Igikoni table");
    expect(listing.seller.id).toBe(seller.id);

    const res = await api().get(`/api/v1/listings/${listing.id}`);
    expect(res.status).toBe(200);
    expect(res.body.listing.id).toBe(listing.id);
  });

  it("validates listing input", async () => {
    const seller = await registerUser();
    const res = await api()
      .post("/api/v1/listings")
      .set(auth(seller.token))
      .send({ title: "x", price: -5, categorySlug: "nope", neighborhoodSlug: "kimironko" });
    expect(res.status).toBe(422);
  });

  it("filters by category and free items", async () => {
    const seller = await registerUser();
    await createListing(seller.token, { title: "Free chair", price: 0, isFree: true, categorySlug: "ibikinisho" });
    await createListing(seller.token, { title: "Paid phone", price: 100000, categorySlug: "ibikoresho-bya-elegitoroniki" });

    const free = await api().get("/api/v1/listings?freeOnly=true");
    expect(free.status).toBe(200);
    expect(free.body.items.every((l: { isFree: boolean }) => l.isFree)).toBe(true);

    const electronics = await api().get("/api/v1/listings?category=ibikoresho-bya-elegitoroniki");
    expect(electronics.body.items).toHaveLength(1);
    expect(electronics.body.items[0].title).toBe("Paid phone");
  });

  it("paginates with a stable cursor", async () => {
    const seller = await registerUser();
    for (let i = 0; i < 5; i++) await createListing(seller.token, { title: `Item ${i}` });
    const first = await api().get("/api/v1/listings?limit=2");
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();

    const second = await api().get(`/api/v1/listings?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`);
    expect(second.body.items).toHaveLength(2);
    const firstIds = first.body.items.map((l: { id: string }) => l.id);
    const secondIds = second.body.items.map((l: { id: string }) => l.id);
    expect(firstIds.some((id: string) => secondIds.includes(id))).toBe(false);
  });

  it("only lets the owner update a listing", async () => {
    const seller = await registerUser();
    const other = await registerUser();
    const listing = await createListing(seller.token);

    const forbidden = await api()
      .patch(`/api/v1/listings/${listing.id}`)
      .set(auth(other.token))
      .send({ title: "Hijacked" });
    expect(forbidden.status).toBe(403);

    const owned = await api()
      .patch(`/api/v1/listings/${listing.id}`)
      .set(auth(seller.token))
      .send({ title: "Updated title" });
    expect(owned.status).toBe(200);
    expect(owned.body.listing.title).toBe("Updated title");
  });

  it("marks a listing sold and increments completed sales", async () => {
    const seller = await registerUser();
    const listing = await createListing(seller.token);
    const res = await api()
      .post(`/api/v1/listings/${listing.id}/status`)
      .set(auth(seller.token))
      .send({ status: "sold" });
    expect(res.status).toBe(200);
    expect(res.body.listing.status).toBe("sold");

    const profile = await api().get(`/api/v1/users/${seller.id}`);
    expect(profile.body.profile.completedSales).toBe(1);
  });

  it("ranks nearby listings by distance", async () => {
    const seller = await registerUser();
    await createListing(seller.token, { title: "In Kimironko", neighborhoodSlug: "kimironko" });
    await createListing(seller.token, { title: "In Musanze", neighborhoodSlug: "kimironko" });
    const res = await api().get("/api/v1/listings?sort=nearby&neighborhood=kimironko");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0].distanceKm).not.toBeNull();
  });
});
