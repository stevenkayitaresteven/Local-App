import { describe, it, expect } from "vitest";
import { api, auth, registerUser, createAkazi } from "./helpers.js";

describe("akazi (jobs & services)", () => {
  it("creates and fetches a post, computing a pay range", async () => {
    const poster = await registerUser();
    const akazi = await createAkazi(poster.token, { kind: "job", title: "Need a tutor", categorySlug: "kwigisha", payPeriod: "hour", payMin: 3000, payMax: 5000 });
    expect(akazi.kind).toBe("job");
    expect(akazi.poster.id).toBe(poster.id);
    expect(akazi.payMin).toBe(3000);
    expect(akazi.payMax).toBe(5000);
    expect(akazi.status).toBe("open");

    const res = await api().get(`/api/v1/akazi/${akazi.id}`);
    expect(res.status).toBe(200);
    expect(res.body.akazi.id).toBe(akazi.id);
  });

  it("clears pay when the period is negotiable", async () => {
    const poster = await registerUser();
    const akazi = await createAkazi(poster.token, { payPeriod: "negotiable", payMin: 9999, payMax: 99999 });
    expect(akazi.payPeriod).toBe("negotiable");
    expect(akazi.payMin).toBeNull();
    expect(akazi.payMax).toBeNull();
  });

  it("rejects invalid input (bad pay range and unknown category)", async () => {
    const poster = await registerUser();
    const badRange = await api()
      .post("/api/v1/akazi")
      .set(auth(poster.token))
      .send({ kind: "job", title: "Bad pay", description: "ten chars min", categorySlug: "isuku", payPeriod: "day", payMin: 20000, payMax: 5000, neighborhoodSlug: "kimironko" });
    expect(badRange.status).toBe(422);

    const badCategory = await api()
      .post("/api/v1/akazi")
      .set(auth(poster.token))
      .send({ kind: "service", title: "Bad cat", description: "ten chars min", categorySlug: "nope", neighborhoodSlug: "kimironko" });
    expect(badCategory.status).toBe(422);
  });

  it("filters by kind, category and remoteOnly", async () => {
    const poster = await registerUser();
    await createAkazi(poster.token, { kind: "job", title: "Remote dev", categorySlug: "umwuga", isRemote: true });
    await createAkazi(poster.token, { kind: "service", title: "On-site cleaning", categorySlug: "isuku", isRemote: false });

    const jobs = await api().get("/api/v1/akazi?kind=job");
    expect(jobs.status).toBe(200);
    expect(jobs.body.items.every((a: { kind: string }) => a.kind === "job")).toBe(true);

    const cleaning = await api().get("/api/v1/akazi?category=isuku");
    expect(cleaning.body.items).toHaveLength(1);
    expect(cleaning.body.items[0].title).toBe("On-site cleaning");

    const remote = await api().get("/api/v1/akazi?remoteOnly=true");
    expect(remote.body.items.every((a: { isRemote: boolean }) => a.isRemote)).toBe(true);
  });

  it("ranks nearby posts by distance", async () => {
    const poster = await registerUser();
    await createAkazi(poster.token, { neighborhoodSlug: "kimironko" });
    const res = await api().get("/api/v1/akazi?sort=nearby&neighborhood=kimironko");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0].distanceKm).not.toBeNull();
  });

  it("paginates with a stable cursor", async () => {
    const poster = await registerUser();
    for (let i = 0; i < 5; i++) await createAkazi(poster.token, { title: `Gig ${i}` });
    const first = await api().get("/api/v1/akazi?limit=2");
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();
    const second = await api().get(`/api/v1/akazi?limit=2&cursor=${encodeURIComponent(first.body.nextCursor)}`);
    const firstIds = first.body.items.map((a: { id: string }) => a.id);
    const secondIds = second.body.items.map((a: { id: string }) => a.id);
    expect(firstIds.some((id: string) => secondIds.includes(id))).toBe(false);
  });

  it("only lets the owner update or close a post", async () => {
    const poster = await registerUser();
    const other = await registerUser();
    const akazi = await createAkazi(poster.token);

    const forbidden = await api().patch(`/api/v1/akazi/${akazi.id}`).set(auth(other.token)).send({ title: "Hijacked" });
    expect(forbidden.status).toBe(403);

    const owned = await api().patch(`/api/v1/akazi/${akazi.id}`).set(auth(poster.token)).send({ title: "Updated gig" });
    expect(owned.status).toBe(200);
    expect(owned.body.akazi.title).toBe("Updated gig");

    const closed = await api().post(`/api/v1/akazi/${akazi.id}/status`).set(auth(poster.token)).send({ status: "filled" });
    expect(closed.status).toBe(200);
    expect(closed.body.akazi.status).toBe("filled");
  });

  it("bookmarks and unbookmarks a post", async () => {
    const poster = await registerUser();
    const viewer = await registerUser();
    const akazi = await createAkazi(poster.token);

    const added = await api().put(`/api/v1/akazi/${akazi.id}/bookmark`).set(auth(viewer.token));
    expect(added.status).toBe(200);
    expect(added.body.bookmarkCount).toBe(1);

    const saved = await api().get("/api/v1/akazi/bookmarks").set(auth(viewer.token));
    expect(saved.body.akazi).toHaveLength(1);
    expect(saved.body.akazi[0].isBookmarked).toBe(true);

    const removed = await api().delete(`/api/v1/akazi/${akazi.id}/bookmark`).set(auth(viewer.token));
    expect(removed.body.bookmarkCount).toBe(0);
  });

  it("lets a neighbor apply and notifies the poster, then the poster decides", async () => {
    const poster = await registerUser();
    const applicant = await registerUser();
    const akazi = await createAkazi(poster.token, { kind: "job", title: "Shop assistant", categorySlug: "ubucuruzi" });

    const applied = await api()
      .post(`/api/v1/akazi/${akazi.id}/apply`)
      .set(auth(applicant.token))
      .send({ message: "I would love to help at your shop." });
    expect(applied.status).toBe(201);
    expect(applied.body.application.status).toBe("submitted");
    const applicationId = applied.body.application.id;

    // Duplicate application is rejected.
    const dup = await api().post(`/api/v1/akazi/${akazi.id}/apply`).set(auth(applicant.token)).send({ message: "again" });
    expect(dup.status).toBe(409);

    // Application count is reflected on the post and the poster is notified.
    const refreshed = await api().get(`/api/v1/akazi/${akazi.id}`).set(auth(poster.token));
    expect(refreshed.body.akazi.applicationCount).toBe(1);
    const notes = await api().get("/api/v1/notifications").set(auth(poster.token));
    expect(notes.body.items.some((n: { type: string }) => n.type === "akazi_applied")).toBe(true);

    // The poster can see applications; an outsider cannot.
    const outsider = await registerUser();
    const denied = await api().get(`/api/v1/akazi/${akazi.id}/applications`).set(auth(outsider.token));
    expect(denied.status).toBe(403);
    const inbox = await api().get(`/api/v1/akazi/${akazi.id}/applications`).set(auth(poster.token));
    expect(inbox.body.applications).toHaveLength(1);

    // The poster accepts; the applicant is notified.
    const accepted = await api()
      .post(`/api/v1/akazi/applications/${applicationId}/status`)
      .set(auth(poster.token))
      .send({ status: "accepted" });
    expect(accepted.status).toBe(200);
    expect(accepted.body.application.status).toBe("accepted");
    const applicantNotes = await api().get("/api/v1/notifications").set(auth(applicant.token));
    expect(applicantNotes.body.items.some((n: { type: string }) => n.type === "akazi_application_update")).toBe(true);

    // "my applications" lists it with the post summary.
    const mine = await api().get("/api/v1/akazi/applications/mine").set(auth(applicant.token));
    expect(mine.body.applications).toHaveLength(1);
    expect(mine.body.applications[0].akazi.title).toBe("Shop assistant");
  });

  it("forbids applying to your own post and to a closed post", async () => {
    const poster = await registerUser();
    const akazi = await createAkazi(poster.token);
    const own = await api().post(`/api/v1/akazi/${akazi.id}/apply`).set(auth(poster.token)).send({ message: "me" });
    expect(own.status).toBe(400);

    await api().post(`/api/v1/akazi/${akazi.id}/status`).set(auth(poster.token)).send({ status: "closed" });
    const applicant = await registerUser();
    const late = await api().post(`/api/v1/akazi/${akazi.id}/apply`).set(auth(applicant.token)).send({ message: "hi" });
    expect(late.status).toBe(400);
  });

  it("requires auth to post and hides removed posts", async () => {
    const anon = await api().post("/api/v1/akazi").send({ kind: "job", title: "x", description: "ten chars min", categorySlug: "isuku", neighborhoodSlug: "kimironko" });
    expect(anon.status).toBe(401);

    const poster = await registerUser();
    const akazi = await createAkazi(poster.token);
    await api().delete(`/api/v1/akazi/${akazi.id}`).set(auth(poster.token));
    const gone = await api().get(`/api/v1/akazi/${akazi.id}`);
    expect(gone.status).toBe(404);
    const board = await api().get("/api/v1/akazi");
    expect(board.body.items.some((a: { id: string }) => a.id === akazi.id)).toBe(false);
  });
});
