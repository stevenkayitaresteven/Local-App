/**
 * Kinyarwanda ⇄ English glossary used across the interface.
 * The product speaks Kinyarwanda first; English is the developer-facing fallback.
 */
export const GLOSSARY = {
  ahabanza: { rw: "Ahabanza", en: "Home" },
  isoko: { rw: "Isoko", en: "Marketplace" },
  gura: { rw: "Gura", en: "Buy" },
  gurisha: { rw: "Gurisha", en: "Sell" },
  umuryango: { rw: "Umuryango", en: "Community" },
  agaciro: { rw: "Agaciro", en: "Trust score" },
  ikarita: { rw: "Ikarita", en: "Map" },
  ibimina: { rw: "Ibimina", en: "Savings circle" },
  ubutumwa: { rw: "Ubutumwa", en: "Chat" },
  umuganda: { rw: "Umuganda", en: "Community work day" },
  konti: { rw: "Konti", en: "Me" },
  kuBuntu: { rw: "Ku buntu", en: "Free" },
  akazi: { rw: "Akazi", en: "Jobs" },
  imodoka: { rw: "Imodoka", en: "Cars" },
  amazu: { rw: "Amazu", en: "Housing" },
  imenyesha: { rw: "Imenyesha", en: "Notifications" },
  shakisha: { rw: "Shakisha", en: "Search" },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;

/** Currency: Rwandan Franc. Whole-number amounts; no minor unit in common use. */
export const CURRENCY = {
  code: "RWF",
  label: "Frw",
  locale: "rw-RW",
} as const;

export function formatFrw(amount: number): string {
  if (amount === 0) return "Ku buntu";
  return `${new Intl.NumberFormat("en-US").format(Math.round(amount))} Frw`;
}
