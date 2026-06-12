// Smart prescription-transfer helpers. We don't (and legally can't) move an Rx
// ourselves — that's a regulated pharmacist-to-pharmacist action. Instead we
// remove the friction: deep-link to the destination chain's official transfer
// page, and generate a ready-to-read call script. No patient data leaves the
// browser.
import type { Pharmacy } from "../types";

interface TransferPage {
  /** Lowercase substring to match against the pharmacy name. */
  match: string;
  url: string;
}

// Official "transfer a prescription" pages for the major chains. If a path ever
// moves, update it here — this is the single source of truth. Anything not
// listed falls back to a directed web search (never a dead link).
const TRANSFER_PAGES: TransferPage[] = [
  { match: "cvs", url: "https://www.cvs.com/pharmacy/transfer-prescriptions" },
  { match: "target", url: "https://www.cvs.com/pharmacy/transfer-prescriptions" }, // Target Rx = CVS
  { match: "walgreens", url: "https://www.walgreens.com/findcare/pharmacy/transfer-prescriptions" },
  { match: "duane reade", url: "https://www.walgreens.com/findcare/pharmacy/transfer-prescriptions" },
  { match: "rite aid", url: "https://www.riteaid.com/pharmacy/services/transfer-prescription" },
  { match: "walmart", url: "https://www.walmart.com/cp/pharmacy/5431" },
  { match: "costco", url: "https://www.costco.com/pharmacy-transfer-prescription.html" },
  { match: "kroger", url: "https://www.kroger.com/rx/refill/transfer" },
];

/**
 * Best destination URL for transferring a prescription *into* `pharmacyName`.
 * Falls back to a web search for the pharmacy's own transfer page.
 */
export function getTransferUrl(pharmacyName: string): string {
  const n = pharmacyName.toLowerCase();
  const hit = TRANSFER_PAGES.find((t) => n.includes(t.match));
  if (hit) return hit.url;
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${pharmacyName} transfer prescription`,
  )}`;
}

/** True when we have a chain-specific transfer page (vs. a search fallback). */
export function hasDirectTransferPage(pharmacyName: string): boolean {
  const n = pharmacyName.toLowerCase();
  return TRANSFER_PAGES.some((t) => n.includes(t.match));
}

export interface TransferDetails {
  patientName: string;
  dob: string;
  medication: string;
  destination: Pharmacy;
  currentPharmacyName: string;
  currentPharmacyPhone: string;
}

/** A phone-ready script the user can read to the destination pharmacy. */
export function buildCallScript(d: TransferDetails): string {
  const patient = d.patientName.trim() || "[your full name]";
  const dob = d.dob.trim() ? `, DOB ${d.dob.trim()}` : "";
  const from = d.currentPharmacyName.trim() || "[current pharmacy]";
  const fromPhone = d.currentPharmacyPhone.trim() ? ` (${d.currentPharmacyPhone.trim()})` : "";
  return [
    `Hi, I'd like to transfer a prescription to your ${d.destination.name} location.`,
    `• Patient: ${patient}${dob}`,
    `• Medication: ${d.medication}`,
    `• Currently filled at: ${from}${fromPhone}`,
    `Thank you!`,
  ].join("\n");
}
