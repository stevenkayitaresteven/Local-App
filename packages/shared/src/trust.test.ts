import { describe, it, expect } from "vitest";
import { computeAgaciro, tierForScore } from "./trust.js";
import { formatFrw } from "./glossary.js";
import { distanceKm, distanceLabel } from "./locations.js";

describe("computeAgaciro", () => {
  it("gives a new user with nothing verified a low score", () => {
    const { score, tier } = computeAgaciro({
      phoneVerified: false,
      emailVerified: false,
      ratingAverage: null,
      ratingCount: 0,
      completedSales: 0,
      responseRate: null,
      upheldReports: 0,
      accountAgeDays: 0,
    });
    expect(score).toBe(0);
    expect(tier).toBe("new");
  });

  it("rewards a verified, well-rated, active seller", () => {
    const { score, tier } = computeAgaciro({
      phoneVerified: true,
      emailVerified: true,
      ratingAverage: 4.8,
      ratingCount: 24,
      completedSales: 30,
      responseRate: 0.95,
      upheldReports: 0,
      accountAgeDays: 400,
    });
    expect(score).toBeGreaterThanOrEqual(85);
    expect(tier).toBe("pillar");
  });

  it("penalizes upheld reports", () => {
    const base = {
      phoneVerified: true,
      emailVerified: true,
      ratingAverage: 4.5,
      ratingCount: 10,
      completedSales: 10,
      responseRate: 0.8,
      upheldReports: 0,
      accountAgeDays: 200,
    };
    const clean = computeAgaciro(base).score;
    const reported = computeAgaciro({ ...base, upheldReports: 2 }).score;
    expect(reported).toBeLessThan(clean);
  });

  it("never returns out-of-range scores", () => {
    for (let r = 0; r <= 10; r++) {
      const { score } = computeAgaciro({
        phoneVerified: true,
        emailVerified: true,
        ratingAverage: 5,
        ratingCount: 100,
        completedSales: 1000,
        responseRate: 1,
        upheldReports: r,
        accountAgeDays: 1000,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe("tierForScore", () => {
  it("maps boundaries", () => {
    expect(tierForScore(0)).toBe("new");
    expect(tierForScore(40)).toBe("rising");
    expect(tierForScore(65)).toBe("trusted");
    expect(tierForScore(85)).toBe("pillar");
  });
});

describe("formatFrw", () => {
  it("formats amounts and free items", () => {
    expect(formatFrw(0)).toBe("Ku buntu");
    expect(formatFrw(120000)).toBe("120,000 Frw");
  });
});

describe("distance", () => {
  it("is zero for the same point and labels nearby", () => {
    const p = { lat: -1.9446, lng: 30.1262 };
    expect(distanceKm(p, p)).toBeCloseTo(0, 5);
    expect(distanceLabel(0.05)).toBe("Hano hafi");
    expect(distanceLabel(2.5)).toBe("2.5 km");
  });
});
