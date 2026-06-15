// Recent searches (medication + location), persisted in localStorage.
import type { GeoLocation, Medication } from "../types";

export interface RecentSearch {
  medication: Medication;
  /** ZIP the user typed, if any — preferred for display + re-populating. */
  zip?: string;
  /** Resolved location at search time (lets us restore current-location searches). */
  location: GeoLocation;
}

const KEY = "rx-scout:recent-searches";
const MAX = 6;

/** Identity for de-duping: same drug + same place. */
function keyOf(s: RecentSearch): string {
  return `${s.medication.name.toLowerCase()}|${(s.zip || s.location.label).toLowerCase()}`;
}

export function loadRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((s) => s?.medication?.name && s?.location).slice(0, MAX);
  } catch {
    return [];
  }
}

/** Prepend a search (de-duped, most-recent-first); returns the new list. */
export function addRecentSearch(item: RecentSearch): RecentSearch[] {
  const existing = loadRecentSearches().filter((s) => keyOf(s) !== keyOf(item));
  const next = [item, ...existing].slice(0, MAX);
  persist(next);
  return next;
}

/** Remove a single search by index; returns the new list. */
export function removeRecentSearch(index: number): RecentSearch[] {
  const list = loadRecentSearches();
  list.splice(index, 1);
  persist(list);
  return list;
}

function persist(list: RecentSearch[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore quota/availability errors */
  }
}
