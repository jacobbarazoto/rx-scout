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
export async function findPharmacies(
  loc: GeoLocation,
  radiusMeters = 8000,
): Promise<Pharmacy[]> {
  const real = await tryPlacesSearch(loc, radiusMeters);
  const pharmacies = real ?? mockPharmaciesNear(loc);
  return pharmacies
    .map((p) => ({ ...p, distanceMiles: distanceMiles(loc, p) }))
    .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
}

/** True when real (Google Places) data is available in this environment. */
export function placesAvailable(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
}

async function tryPlacesSearch(
  loc: GeoLocation,
  radiusMeters: number,
): Promise<Pharmacy[] | null> {
  // Only attempt if the Places library finished loading (APIProvider mounts it).
  const places = (window as Window & { google?: typeof google }).google?.maps?.places;
  if (!places?.Place) return null;

  // Google Places caps Nearby Search radius at 50km.
  const radius = Math.min(Math.max(radiusMeters, 1000), 50000);
  try {
    const { places: results } = await places.Place.searchNearby({
      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "nationalPhoneNumber",
        "rating",
        "googleMapsURI",
      ],
      locationRestriction: { center: { lat: loc.lat, lng: loc.lng }, radius },
      includedPrimaryTypes: ["pharmacy", "drugstore"],
      maxResultCount: 20, // Places API (New) hard cap per call
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
        phone: r.nationalPhoneNumber ?? undefined,
        rating: r.rating ?? undefined,
        mapsUri: r.googleMapsURI ?? undefined,
      }));
  } catch {
    return null; // Quota/permission/API errors → fall back to mock.
  }
}

/**
 * Fetch additional pharmacies in the area via Text Search, excluding ids we
 * already have. Best-effort "show more" past Nearby Search's 20-result cap.
 * (The JS SDK doesn't expose a page token, so this is a broader query rather
 * than a true next page.)
 */
export async function searchMorePharmacies(
  loc: GeoLocation,
  radiusMeters: number,
  excludeIds: Set<string>,
): Promise<Pharmacy[]> {
  const places = (window as Window & { google?: typeof google }).google?.maps?.places;
  if (!places?.Place) return mockMorePharmacies(loc, excludeIds);

  const radius = Math.min(Math.max(radiusMeters, 1000), 50000);
  try {
    const { places: results } = await places.Place.searchByText({
      textQuery: "pharmacy",
      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "nationalPhoneNumber",
        "rating",
        "googleMapsURI",
      ],
      locationBias: { center: { lat: loc.lat, lng: loc.lng }, radius },
      includedType: "pharmacy",
      maxResultCount: 20,
    });
    return (results ?? [])
      .filter((r) => r.location && !excludeIds.has(r.id ?? ""))
      .map((r) => ({
        id: r.id ?? `${r.displayName}`,
        name: r.displayName ?? "Pharmacy",
        address: r.formattedAddress ?? "",
        lat: r.location!.lat(),
        lng: r.location!.lng(),
        phone: r.nationalPhoneNumber ?? undefined,
        rating: r.rating ?? undefined,
        mapsUri: r.googleMapsURI ?? undefined,
      }))
      .map((p) => ({ ...p, distanceMiles: distanceMiles(loc, p) }))
      .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
  } catch {
    return [];
  }
}

/** Mock "show more": a second batch at larger radii (dev / no key). */
function mockMorePharmacies(loc: GeoLocation, excludeIds: Set<string>): Pharmacy[] {
  return mockPharmaciesNear(loc, 32)
    .filter((p) => !excludeIds.has(p.id))
    .slice(0, 12)
    .map((p) => ({ ...p, distanceMiles: distanceMiles(loc, p) }));
}

/** Deterministic mock pharmacies clustered around the search location. */
export function mockPharmaciesNear(loc: GeoLocation, count = 20): Pharmacy[] {
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
      phone: mockPhone(i),
      rating: Math.round((3.4 + ((i * 7) % 16) / 10) * 10) / 10, // 3.4–4.9
      mapsUri: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
  }
  return out;
}

/** Deterministic, plausible US phone number for a mock pharmacy. */
function mockPhone(i: number): string {
  const area = 200 + ((i * 53) % 700); // 200–899
  const prefix = 200 + ((i * 97) % 700);
  const line = (i * 1234 + 5678) % 10000;
  return `(${area}) ${prefix}-${String(line).padStart(4, "0")}`;
}
