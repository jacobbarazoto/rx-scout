// Medication search backed by the NLM RxNorm/RxNav API.
// Free, no API key, CORS-enabled. Docs: https://rxnav.nlm.nih.gov/RxNormAPIs.html
import type { Medication } from "../types";

const BASE = "https://rxnav.nlm.nih.gov/REST";

interface ApproximateGroup {
  approximateGroup?: {
    candidate?: { rxcui?: string; rxaui?: string; score?: string; rank?: string }[];
  };
}

interface RxcuiProperties {
  properties?: { rxcui?: string; name?: string };
}

/**
 * Look up medication name suggestions for an autocomplete box.
 * Uses RxNorm's approximate-match endpoint, then resolves each candidate
 * rxcui to a display name. De-duplicates by name.
 */
export async function searchMedications(
  term: string,
  signal?: AbortSignal,
): Promise<Medication[]> {
  const q = term.trim();
  if (q.length < 2) return [];

  const url = `${BASE}/approximateTerm.json?term=${encodeURIComponent(q)}&maxEntries=8`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`RxNorm search failed (${res.status})`);

  const data: ApproximateGroup = await res.json();
  const candidates = data.approximateGroup?.candidate ?? [];

  // Keep the first occurrence of each unique rxcui, preserving rank order.
  const seen = new Set<string>();
  const rxcuis = candidates
    .map((c) => c.rxcui)
    .filter((id): id is string => Boolean(id) && !seen.has(id!) && (seen.add(id!), true))
    .slice(0, 8);

  const names = await Promise.all(rxcuis.map((id) => resolveName(id, signal)));

  const out: Medication[] = [];
  const seenNames = new Set<string>();
  names.forEach((name, i) => {
    if (name && !seenNames.has(name.toLowerCase())) {
      seenNames.add(name.toLowerCase());
      out.push({ id: rxcuis[i], name });
    }
  });
  return out;
}

async function resolveName(rxcui: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/rxcui/${rxcui}/properties.json`, { signal });
    if (!res.ok) return null;
    const data: RxcuiProperties = await res.json();
    return data.properties?.name ?? null;
  } catch {
    return null;
  }
}
