// Over-the-counter detection via the openFDA NDC directory. Free, no key.
// A drug is considered OTC-available if any NDC product for the ingredient is
// labeled "HUMAN OTC DRUG" (many drugs, e.g. ibuprofen, exist as both OTC and
// prescription strengths). Docs: https://open.fda.gov/apis/drug/ndc/
const ENDPOINT = "https://api.fda.gov/drug/ndc.json";

interface CountResult {
  results?: { term: string; count: number }[];
}

export interface OtcStatus {
  isOtc: boolean;
}

export async function getOtcStatus(drugName: string, signal?: AbortSignal): Promise<OtcStatus> {
  const ingredient = drugName.trim().split(/\s+/)[0];
  if (!ingredient) return { isOtc: false };

  const search = `generic_name:"${ingredient}"`;
  const url = `${ENDPOINT}?search=${encodeURIComponent(search)}&count=product_type.exact`;

  try {
    const res = await fetch(url, { signal });
    if (res.status === 404) return { isOtc: false }; // no NDC match → treat as not OTC
    if (!res.ok) return { isOtc: false };
    const data: CountResult = await res.json();
    const otc = data.results?.find((r) => /OTC/i.test(r.term));
    return { isOtc: Boolean(otc && otc.count > 0) };
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return { isOtc: false }; // degrade quietly
  }
}
