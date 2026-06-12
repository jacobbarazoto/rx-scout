// Core domain types for rx-scout.

/** A medication suggestion returned from RxNorm search/autocomplete. */
export interface Medication {
  /** RxNorm concept id (rxcui) when available, else the name itself. */
  id: string;
  /** Display name, e.g. "Atorvastatin 20 MG Oral Tablet" or "atorvastatin". */
  name: string;
}

/** National-level FDA drug shortage status for a medication. */
export interface ShortageStatus {
  /** True when openFDA reports at least one *current* shortage for the drug. */
  inShortage: boolean;
  /** Human-readable status, e.g. "Current", "Resolved", or "No shortage on record". */
  label: string;
  /** Most recent shortage records (already filtered/sorted), for detail display. */
  records: ShortageRecord[];
}

export interface ShortageRecord {
  genericName: string;
  status: string;
  company: string;
  /** Free-text reason the FDA lists for the shortage, if any. */
  reason?: string;
  /** ISO-ish date string from the openFDA record, if any. */
  updated?: string;
}

/** A geographic point plus a human label for the searched location. */
export interface GeoLocation {
  lat: number;
  lng: number;
  label: string;
}

/** A pharmacy near the user, from Google Places or the mock provider. */
export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Straight-line distance from the search location, in miles. */
  distanceMiles?: number;
}

export type AvailabilityLevel = "in_stock" | "limited" | "out_of_stock";

/** Simulated per-pharmacy stock for a given medication. NOT real inventory. */
export interface Availability {
  level: AvailabilityLevel;
  /** Simulated units on hand. */
  quantity: number;
  /** How long ago this simulated reading was "taken", e.g. "12 min ago". */
  updatedLabel: string;
}

/** A pharmacy paired with its simulated availability for the searched drug. */
export interface PharmacyResult extends Pharmacy {
  availability: Availability;
}
