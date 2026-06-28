import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app.js";

export const app: Express = createApp();
export const api = () => request(app);

export interface TestUser {
  id: string;
  token: string;
  phone: string;
  displayName: string;
}

let counter = 0;

export async function registerUser(overrides: Partial<{ displayName: string; neighborhoodSlug: string }> = {}): Promise<TestUser> {
  counter += 1;
  const phone = `+25078810${String(1000 + counter).slice(-4)}`;
  const res = await api()
    .post("/api/v1/auth/register")
    .send({
      displayName: overrides.displayName ?? `Test User ${counter}`,
      phone,
      password: "umuturanyi123",
      neighborhoodSlug: overrides.neighborhoodSlug ?? "kimironko",
    });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.user.id, token: res.body.accessToken, phone, displayName: res.body.user.displayName };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createListing(token: string, overrides: Record<string, unknown> = {}) {
  const res = await api()
    .post("/api/v1/listings")
    .set(auth(token))
    .send({
      title: "Test Sofa",
      description: "A comfy test sofa",
      price: 50000,
      categorySlug: "ibikoresho-byo-mu-nzu",
      neighborhoodSlug: "kimironko",
      condition: "good",
      ...overrides,
    });
  if (res.status !== 201) throw new Error(`createListing failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.listing;
}
