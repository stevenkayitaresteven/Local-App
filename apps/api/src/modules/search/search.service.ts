import { prisma } from "../../lib/prisma.js";
import { CATEGORIES } from "@umuturanyi/shared";

export async function recordSearch(term: string, userId?: string): Promise<void> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return;
  await prisma.searchQuery.create({ data: { term: trimmed.toLowerCase(), userId: userId ?? null } }).catch(() => {});
}

/** Autocomplete: blends matching live listing titles, categories, and popular terms. */
export async function suggestions(prefix: string): Promise<string[]> {
  const p = prefix.trim().toLowerCase();
  if (p.length < 1) return popularSearches(8);

  const [titles, terms] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "active", deletedAt: null, title: { contains: p } },
      select: { title: true },
      take: 6,
      orderBy: { favoriteCount: "desc" },
    }),
    prisma.searchQuery.groupBy({
      by: ["term"],
      where: { term: { startsWith: p } },
      _count: { term: true },
      orderBy: { _count: { term: "desc" } },
      take: 4,
    }),
  ]);

  const catMatches = CATEGORIES.filter(
    (c) => c.rw.toLowerCase().includes(p) || c.en.toLowerCase().includes(p),
  ).map((c) => c.rw);

  const merged = [...titles.map((t) => t.title), ...terms.map((t) => t.term), ...catMatches];
  return dedupe(merged).slice(0, 8);
}

export async function popularSearches(limit = 8): Promise<string[]> {
  const rows = await prisma.searchQuery.groupBy({
    by: ["term"],
    _count: { term: true },
    orderBy: { _count: { term: "desc" } },
    take: limit,
  });
  return rows.map((r) => r.term);
}

export async function recentSearches(userId: string, limit = 8): Promise<string[]> {
  const rows = await prisma.searchQuery.findMany({
    where: { userId },
    select: { term: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return dedupe(rows.map((r) => r.term)).slice(0, limit);
}

export async function clearRecentSearches(userId: string): Promise<void> {
  await prisma.searchQuery.deleteMany({ where: { userId } });
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}
