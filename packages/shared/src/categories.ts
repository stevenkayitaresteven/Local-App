/**
 * Marketplace taxonomy. Slugs are stable identifiers used by the API and URLs;
 * `rw`/`en` are display labels. `icon` is an emoji used by the warm, illustrative UI.
 */
export interface CategoryDef {
  slug: string;
  rw: string;
  en: string;
  icon: string;
  /** Verticals get dedicated browse experiences (cars, housing, jobs). */
  vertical?: boolean;
}

export const CATEGORIES: CategoryDef[] = [
  { slug: "imboga", rw: "Imboga n'imbuto", en: "Produce", icon: "🥕" },
  { slug: "ibikoresho-byo-mu-nzu", rw: "Ibikoresho byo mu nzu", en: "Home goods", icon: "🛋️" },
  { slug: "imyenda", rw: "Imyenda", en: "Clothing", icon: "👗" },
  { slug: "ibikoresho-bya-elegitoroniki", rw: "Elegitoroniki", en: "Electronics", icon: "📱" },
  { slug: "ibikinisho", rw: "Ibikinisho", en: "Kids & toys", icon: "🧸" },
  { slug: "ubuhinzi", rw: "Ubuhinzi n'ubworozi", en: "Farming", icon: "🌾" },
  { slug: "imodoka", rw: "Imodoka", en: "Cars", icon: "🚗", vertical: true },
  { slug: "amazu", rw: "Amazu", en: "Housing", icon: "🏠", vertical: true },
  { slug: "akazi", rw: "Akazi", en: "Jobs & services", icon: "🛠️", vertical: true },
  { slug: "ibindi", rw: "Ibindi", en: "Other", icon: "📦" },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
export const VERTICAL_SLUGS = CATEGORIES.filter((c) => c.vertical).map((c) => c.slug);

export function categoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Community feed topic tags (Umuryango). */
export const COMMUNITY_TOPICS = [
  { slug: "amakuru", rw: "Amakuru", en: "News" },
  { slug: "ibiribwa", rw: "Ibiribwa", en: "Food" },
  { slug: "umutekano", rw: "Umutekano", en: "Safety" },
  { slug: "ibibazo", rw: "Ibibazo", en: "Questions" },
  { slug: "umuganda", rw: "Umuganda", en: "Community work" },
  { slug: "ibyatakaye", rw: "Ibyatakaye/Ibyabonetse", en: "Lost & found" },
] as const;

export const COMMUNITY_TOPIC_SLUGS = COMMUNITY_TOPICS.map((t) => t.slug);
