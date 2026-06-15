// Recent medication searches, persisted in localStorage (most recent first).
const KEY = "rx-scout:recent-meds";
const MAX = 6;

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Add a search to the front (de-duped, case-insensitive), return the new list. */
export function addRecentSearch(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return loadRecentSearches();
  const existing = loadRecentSearches().filter(
    (n) => n.toLowerCase() !== trimmed.toLowerCase(),
  );
  const next = [trimmed, ...existing].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota/availability errors */
  }
  return next;
}

export function clearRecentSearches(): string[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return [];
}
