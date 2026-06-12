// SIMULATED per-pharmacy stock. This is NOT real inventory — no public API
// exposes live per-store prescription stock. The values are deterministic
// (stable for a given pharmacy + drug) and are biased toward scarcity when the
// drug is in a real FDA shortage, so the demo stays internally consistent.
import type { Availability, AvailabilityLevel } from "../types";

/** Simple, stable string hash (FNV-1a) → unsigned 32-bit int. */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A deterministic pseudo-random number in [0, 1) seeded by the inputs. */
function seededUnit(pharmacyId: string, drugName: string, salt = ""): number {
  return hash(`${pharmacyId}::${drugName.toLowerCase()}::${salt}`) / 0xffffffff;
}

const UPDATED_LABELS = [
  "just now",
  "8 min ago",
  "15 min ago",
  "32 min ago",
  "1 hr ago",
  "2 hrs ago",
];

/**
 * Produce a stable simulated availability for a pharmacy + medication.
 * @param inShortage  When true (real FDA shortage), skew toward limited/out.
 */
export function simulateAvailability(
  pharmacyId: string,
  drugName: string,
  inShortage: boolean,
): Availability {
  const roll = seededUnit(pharmacyId, drugName);

  // Probability bands shift when the drug is in a national shortage.
  let level: AvailabilityLevel;
  if (inShortage) {
    level = roll < 0.45 ? "out_of_stock" : roll < 0.85 ? "limited" : "in_stock";
  } else {
    level = roll < 0.62 ? "in_stock" : roll < 0.9 ? "limited" : "out_of_stock";
  }

  const qtyRoll = seededUnit(pharmacyId, drugName, "qty");
  const quantity =
    level === "out_of_stock"
      ? 0
      : level === "limited"
        ? 1 + Math.floor(qtyRoll * 9) // 1–9
        : 20 + Math.floor(qtyRoll * 180); // 20–199

  const labelIdx = Math.floor(seededUnit(pharmacyId, drugName, "time") * UPDATED_LABELS.length);

  return { level, quantity, updatedLabel: UPDATED_LABELS[labelIdx] };
}

export const AVAILABILITY_META: Record<
  AvailabilityLevel,
  { label: string; color: string }
> = {
  in_stock: { label: "In stock", color: "#1a7f37" },
  limited: { label: "Limited", color: "#bf8700" },
  out_of_stock: { label: "Out of stock", color: "#cf222e" },
};
