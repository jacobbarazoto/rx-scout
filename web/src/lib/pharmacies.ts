// Nearby pharmacy lookup. Uses Google Places when a Maps API key is configured
// (real pharmacies near the user); otherwise falls back to deterministic mock
// pharmacies so the app is fully functional with zero setup.
import type { GeoLocation, Pharmacy } from "../types";
import { distanceMiles } from "./geo";

const CHAINS = [
  "CVS Pharmacy",
  "Walgreens",
  "Rite Aid",
  "Walmart Pharmacy",
  "Costco Pharmacy",
  "Kroger Pharmacy",
  "Safeway Pharmacy",
  "Target Pharmacy",
  "Community Drug & Compounding",
  "Health Mart Pharmacy",
];

const STREETS = [
  "Main St",
  "Oak Ave",
  "Market St",
  "Maple Dr",
  "Sunset Blvd",
  "Elm St",
  "Broadway",
  "Cedar Ln",
  "Park Ave",
  "1st St",
];

/**
 * Find pharmacies near a location. Returns real Places results when the Google
 * Maps JS API (with the Places library) is loaded; otherwise mock data.
 */
export async function findPharmacies(loc: GeoLocation): Promise<Pharmacy[]> {
  const real = await tryPlacesSearch(loc);
  const pharmacies = real ?? mockPharmaciesNear(loc);
  return pharmacies
    .map((p) => ({ ...p, distanceMiles: distanceMiles(loc, p) }))
    .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
}

/** True when real (Google Places) data is available in this environment. */
export function placesAvailable(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
}

async function tryPlacesSearch(loc: GeoLocation): Promise<Pharmacy[] | null> {
  // Only attempt if the Places library finished loading (APIProvider mounts it).
  const places = (window as Window & { google?: typeof google }).google?.maps?.places;
  if (!places?.Place) return null;

  try {
    const { places: results } = await places.Place.searchNearby({
      fields: ["id", "displayName", "formattedAddress", "location"],
      locationRestriction: { center: { lat: loc.lat, lng: loc.lng }, radius: 8000 },
      includedPrimaryTypes: ["pharmacy", "drugstore"],
      maxResultCount: 15,
    });
    if (!results?.length) return null;

    return results
      .filter((r) => r.location)
      .map((r) => ({
        id: r.id ?? `${r.displayName}`,
        name: r.displayName ?? "Pharmacy",
        address: r.formattedAddress ?? "",
        lat: r.location!.lat(),
        lng: r.location!.lng(),
      }));
  } catch {
    return null; // Quota/permission/API errors → fall back to mock.
  }
}

/** Deterministic mock pharmacies clustered around the search location. */
export function mockPharmaciesNear(loc: GeoLocation, count = 8): Pharmacy[] {
  const out: Pharmacy[] = [];
  for (let i = 0; i < count; i++) {
    // Spread points on a rough spiral so they don't overlap on the map.
    const angle = i * 2.39996; // golden angle (radians)
    const radius = 0.004 + (i / count) * 0.05; // ~0.3–4 miles
    const lat = loc.lat + Math.cos(angle) * radius;
    const lng = loc.lng + (Math.sin(angle) * radius) / Math.cos((loc.lat * Math.PI) / 180);
    const streetNo = 100 + ((i * 137) % 8900);
    out.push({
      id: `mock-${i}`,
      name: CHAINS[i % CHAINS.length],
      address: `${streetNo} ${STREETS[i % STREETS.length]}`,
      lat,
      lng,
    });
  }
  return out;
}
