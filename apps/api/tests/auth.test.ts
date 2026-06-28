import { describe, it, expect } from "vitest";
import { api, registerUser, auth } from "./helpers.js";

describe("auth", () => {
  it("registers a user and returns tokens", async () => {
    const res = await api().post("/api/v1/auth/register").send({
      displayName: "Aline M",
      phone: "+250788111222",
      password: "umuturanyi123",
      neighborhoodSlug: "kimironko",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.displayName).toBe("Aline M");
    expect(res.body.user.phone).toBe("+250788111222");
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it("rejects duplicate phone numbers", async () => {
    const payload = {
      displayName: "Dup",
      phone: "+250788333444",
      password: "umuturanyi123",
      neighborhoodSlug: "remera",
    };
    await api().post("/api/v1/auth/register").send(payload);
    const res = await api().post("/api/v1/auth/register").send(payload);
    expect(res.status).toBe(409);
  });

  it("rejects weak passwords with a 422", async () => {
    const res = await api().post("/api/v1/auth/register").send({
      displayName: "Weak",
      phone: "+250788555666",
      password: "short",
      neighborhoodSlug: "remera",
    });
    expect(res.status).toBe(422);
  });

  it("logs in with phone and password", async () => {
    const user = await registerUser();
    const res = await api().post("/api/v1/auth/login").send({ identifier: user.phone, password: "umuturanyi123" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it("rejects bad credentials with 401", async () => {
    const user = await registerUser();
    const res = await api().post("/api/v1/auth/login").send({ identifier: user.phone, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("returns the current user from /me", async () => {
    const user = await registerUser();
    const res = await api().get("/api/v1/auth/me").set(auth(user.token));
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it("rejects /me without a token", async () => {
    const res = await api().get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("rotates refresh tokens and invalidates the old one", async () => {
    const reg = await api().post("/api/v1/auth/register").send({
      displayName: "Rot",
      phone: "+250788777888",
      password: "umuturanyi123",
      neighborhoodSlug: "kacyiru",
    });
    const oldRefresh = reg.body.refreshToken;
    const refreshed = await api().post("/api/v1/auth/refresh").send({ refreshToken: oldRefresh });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();

    const reuse = await api().post("/api/v1/auth/refresh").send({ refreshToken: oldRefresh });
    expect(reuse.status).toBe(401);
  });

  it("verifies a phone number via OTP and raises Agaciro", async () => {
    const reg = await api().post("/api/v1/auth/register").send({
      displayName: "Verify",
      phone: "+250788999000",
      password: "umuturanyi123",
      neighborhoodSlug: "kimironko",
    });
    const token = reg.body.accessToken;
    const code = reg.body.devCode as string;
    expect(code).toMatch(/^\d{6}$/);

    const before = await api().get("/api/v1/auth/me").set(auth(token));
    const verify = await api().post("/api/v1/auth/phone/verify").set(auth(token)).send({ code });
    expect(verify.status).toBe(200);
    expect(verify.body.user.phoneVerified).toBe(true);
    expect(verify.body.user.agaciro).toBeGreaterThan(before.body.user.agaciro);
  });
});
