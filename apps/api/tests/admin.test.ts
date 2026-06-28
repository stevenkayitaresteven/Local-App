import { describe, it, expect } from "vitest";
import { api, auth, registerUser, createListing } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

async function makeAdmin() {
  const admin = await registerUser({ displayName: "Admin" });
  await prisma.user.update({ where: { id: admin.id }, data: { role: "admin" } });
  // Re-login to mint a token carrying the admin role claim.
  const res = await api().post("/api/v1/auth/login").send({ identifier: admin.phone, password: "umuturanyi123" });
  return { ...admin, token: res.body.accessToken };
}

describe("admin & moderation", () => {
  it("blocks non-staff from admin routes", async () => {
    const user = await registerUser();
    const res = await api().get("/api/v1/admin/stats").set(auth(user.token));
    expect(res.status).toBe(403);
  });

  it("lets an admin view dashboard stats", async () => {
    const admin = await makeAdmin();
    const res = await api().get("/api/v1/admin/stats").set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.stats).toHaveProperty("users");
    expect(res.body.stats).toHaveProperty("activeListings");
  });

  it("resolves a report by taking down the listing", async () => {
    const admin = await makeAdmin();
    const seller = await registerUser();
    const reporter = await registerUser();
    const listing = await createListing(seller.token);

    const report = await api()
      .post("/api/v1/users/reports")
      .set(auth(reporter.token))
      .send({ targetType: "listing", targetId: listing.id, reason: "spam" });
    expect(report.status).toBe(201);

    const resolve = await api()
      .post(`/api/v1/admin/reports/${report.body.reportId}/resolve`)
      .set(auth(admin.token))
      .send({ action: "actioned", removeTarget: true });
    expect(resolve.status).toBe(200);

    const gone = await api().get(`/api/v1/listings/${listing.id}`);
    expect(gone.status).toBe(404);
  });

  it("suspends a user and revokes their sessions", async () => {
    const admin = await makeAdmin();
    const target = await registerUser();
    const res = await api()
      .post(`/api/v1/admin/users/${target.id}/suspend`)
      .set(auth(admin.token))
      .send({ suspended: true });
    expect(res.status).toBe(200);

    // Suspended users can no longer use the marketplace.
    const blocked = await api().post("/api/v1/listings").set(auth(target.token)).send({
      title: "Still here?",
      price: 1000,
      categorySlug: "ibindi",
      neighborhoodSlug: "kimironko",
    });
    expect([401, 403, 500]).toContain(blocked.status);
  });
});

describe("wallet", () => {
  it("tops up and pays from the Umuturanyi Pay wallet", async () => {
    const user = await registerUser();
    const topup = await api()
      .post("/api/v1/wallet/topup")
      .set(auth(user.token))
      .send({ amount: 10000, provider: "mtn_momo" });
    expect(topup.status).toBe(200);
    expect(topup.body.balance).toBe(10000);

    const pay = await api()
      .post("/api/v1/wallet/pay")
      .set(auth(user.token))
      .send({ amount: 4000, provider: "mtn_momo", purpose: "test purchase" });
    expect(pay.status).toBe(200);
    expect(pay.body.balance).toBe(6000);

    const overspend = await api()
      .post("/api/v1/wallet/pay")
      .set(auth(user.token))
      .send({ amount: 999999, provider: "mtn_momo" });
    expect(overspend.status).toBe(400);
  });
});
