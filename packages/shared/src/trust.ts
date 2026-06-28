/**
 * Agaciro — the community trust score (0–100).
 *
 * A transparent, explainable reputation model. Every input is something a neighbor
 * can understand: did you verify your phone, do people rate you well, do you reply,
 * have you been reported. Kept pure so both the API (authoritative compute) and the
 * web client (preview/explanation) agree.
 */

export interface AgaciroInputs {
  phoneVerified: boolean;
  emailVerified: boolean;
  /** Average star rating 1–5, or null when never rated. */
  ratingAverage: number | null;
  ratingCount: number;
  completedSales: number;
  /** 0–1 share of conversations the user replies to. */
  responseRate: number | null;
  /** Reports upheld against this user. */
  upheldReports: number;
  accountAgeDays: number;
}

export interface AgaciroResult {
  score: number;
  tier: TrustTier;
  /** Per-factor contribution, for the "why" breakdown in the UI. */
  breakdown: { label: string; points: number }[];
}

export type TrustTier = "new" | "rising" | "trusted" | "pillar";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function computeAgaciro(input: AgaciroInputs): AgaciroResult {
  const breakdown: { label: string; points: number }[] = [];
  const add = (label: string, points: number) => {
    if (points !== 0) breakdown.push({ label, points: Math.round(points) });
  };

  // Identity verification (max 25)
  add("Telefoni yemejwe", input.phoneVerified ? 18 : 0);
  add("Imeyili yemejwe", input.emailVerified ? 7 : 0);

  // Ratings (max 35) — needs a few ratings before it counts fully
  if (input.ratingAverage !== null && input.ratingCount > 0) {
    const confidence = clamp(input.ratingCount / 5, 0, 1);
    add("Amanota y'abaguzi", ((input.ratingAverage - 1) / 4) * 35 * confidence);
  }

  // Activity / completed sales (max 20, diminishing)
  add("Ibyacurujwe byarangiye", clamp(Math.log10(input.completedSales + 1) * 14, 0, 20));

  // Responsiveness (max 12)
  if (input.responseRate !== null) {
    add("Gusubiza vuba", input.responseRate * 12);
  }

  // Tenure (max 8)
  add("Igihe umaze kuri Umuturanyi", clamp(input.accountAgeDays / 180, 0, 1) * 8);

  // Penalties
  add("Raporo zemejwe", -input.upheldReports * 15);

  const score = clamp(Math.round(breakdown.reduce((s, b) => s + b.points, 0)), 0, 100);
  return { score, tier: tierForScore(score), breakdown };
}

export function tierForScore(score: number): TrustTier {
  if (score >= 85) return "pillar";
  if (score >= 65) return "trusted";
  if (score >= 40) return "rising";
  return "new";
}

export const TRUST_TIER_LABEL: Record<TrustTier, { rw: string; en: string }> = {
  new: { rw: "Mushya", en: "New" },
  rising: { rw: "Aritera imbere", en: "Rising" },
  trusted: { rw: "Yizewe", en: "Trusted" },
  pillar: { rw: "Inkingi y'umudugudu", en: "Community pillar" },
};
