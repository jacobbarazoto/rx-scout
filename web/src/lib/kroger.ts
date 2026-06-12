// Client for the Kroger stock proxy (Cloud Function at /api/kroger).
// Returns REAL per-store price + stock level for Kroger-family stores. When the
// function isn't deployed (local dev), this resolves to [] gracefully.
import type { GeoLocation } from "../types";

export interface KrogerProduct {
  description: string;
  brand?: string;
  size?: string | null;
  /** Regular shelf price in USD. */
  price?: number | null;
  /** "HIGH" | "LOW" | "TEMPORARILY_OUT_OF_STOCK" | null */
  stockLevel?: string | null;
  /** Aisle description, e.g. "AISLE 8". */
  aisle?: string | null;
}

export interface KrogerStore {
  name: string;
  address: string;
  products: KrogerProduct[];
}

// Defaults to the same-origin Hosting rewrite; override with a Cloudflare
// Worker URL (VITE_KROGER_PROXY_URL) when proxying around the datacenter-IP block.
const PROXY_BASE = import.meta.env.VITE_KROGER_PROXY_URL || "/api/kroger";

export async function getKrogerStock(
  term: string,
  loc: GeoLocation,
  signal?: AbortSignal,
): Promise<KrogerStore[]> {
  const url = `${PROXY_BASE}?term=${encodeURIComponent(term)}&lat=${loc.lat}&lng=${loc.lng}`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    // When the function isn't deployed, Hosting serves the SPA's index.html;
    // guard against parsing HTML as JSON.
    if (!res.headers.get("content-type")?.includes("application/json")) return [];
    const data = await res.json();
    return data.stores ?? [];
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return [];
  }
}
