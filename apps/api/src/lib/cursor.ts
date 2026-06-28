/**
 * Opaque keyset-pagination cursors. We base64url-encode the sort key + id so the
 * client never depends on offsets (stable under inserts, scales to large tables).
 */
export function encodeCursor(value: { key: string | number; id: string }): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeCursor(cursor: string | undefined): { key: string | number; id: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (parsed && (typeof parsed.key === "string" || typeof parsed.key === "number") && typeof parsed.id === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generic helper: takes `limit + 1` rows, returns the page plus the next cursor.
 */
export function paginate<T extends { id: string }>(
  rows: T[],
  limit: number,
  keyOf: (row: T) => string | number,
): { items: T[]; nextCursor: string | null } {
  if (rows.length <= limit) return { items: rows, nextCursor: null };
  const items = rows.slice(0, limit);
  const last = items[items.length - 1]!;
  return { items, nextCursor: encodeCursor({ key: keyOf(last), id: last.id }) };
}
