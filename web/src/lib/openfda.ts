// Real FDA drug shortage data via the openFDA Drug Shortages endpoint.
// Free, no key required (a key only raises rate limits).
// Docs: https://open.fda.gov/apis/drug/drugshortages/
import type { ShortageStatus, ShortageRecord } from "../types";

const ENDPOINT = "https://api.fda.gov/drug/shortages.json";

interface OpenFdaShortageResult {
  generic_name?: string;
  status?: string;
  company_name?: string;
  shortage_reason?: string;
  availability?: string;
  update_date?: string;
  initial_posting_date?: string;
}

interface OpenFdaResponse {
  error?: { code: string; message: string };
  results?: OpenFdaShortageResult[];
}

/**
 * Check whether a medication has any FDA shortage records. The drug name from
 * RxNorm is often a full clinical description (e.g. "Atorvastatin 20 MG Oral
 * Tablet"); we search on the first token (the ingredient) for a better hit rate.
 */
export async function getShortageStatus(
  drugName: string,
  signal?: AbortSignal,
): Promise<ShortageStatus> {
  const ingredient = drugName.trim().split(/\s+/)[0];
  if (!ingredient) return noShortage();

  // openFDA shortage records expose `generic_name` (a tokenized text field), so
  // a single-token phrase search on the ingredient matches reliably.
  const search = `generic_name:"${ingredient}"`;
  const url = `${ENDPOINT}?search=${encodeURIComponent(search)}&limit=50`;

  let data: OpenFdaResponse;
  try {
    const res = await fetch(url, { signal });
    // openFDA returns 404 when a search yields zero matches — that's "no shortage".
    if (res.status === 404) return noShortage();
    if (!res.ok) throw new Error(`openFDA request failed (${res.status})`);
    data = await res.json();
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    // Network/parsing issue: degrade gracefully rather than break the search.
    return { inShortage: false, label: "Shortage data unavailable", records: [] };
  }

  if (data.error || !data.results?.length) return noShortage();

  const records: ShortageRecord[] = data.results.map((r) => ({
    genericName: r.generic_name || ingredient,
    status: r.status || "Unknown",
    company: r.company_name || "Unknown manufacturer",
    reason: r.shortage_reason || r.availability,
    updated: r.update_date || r.initial_posting_date,
  }));

  // openFDA statuses: "Current" (active shortage), "To Be Discontinued", "Resolved".
  const isCurrent = (s: string) => /^current$/i.test(s);
  const current = records.filter((r) => isCurrent(r.status));
  const inShortage = current.length > 0;

  let label: string;
  if (inShortage) label = "Current shortage";
  else if (records.some((r) => /discontinued/i.test(r.status))) label = "Being discontinued";
  else label = "Resolved / past shortage";

  return {
    inShortage,
    label,
    // Surface current records first, capped for display.
    records: [...current, ...records.filter((r) => !isCurrent(r.status))].slice(0, 5),
  };
}

function noShortage(): ShortageStatus {
  return { inShortage: false, label: "No shortage on record", records: [] };
}
