// Location resolution: US ZIP → coordinates (via zippopotam.us, free/no-key)
// and browser geolocation. Plus a haversine distance helper.
import type { GeoLocation } from "../types";

interface ZippoResponse {
  "post code"?: string;
  places?: { "place name"?: string; state?: string; latitude?: string; longitude?: string }[];
}

/** Resolve a 5-digit US ZIP code to a GeoLocation. Throws on a bad/unknown ZIP. */
export async function geocodeZip(zip: string, signal?: AbortSignal): Promise<GeoLocation> {
  const clean = zip.trim();
  if (!/^\d{5}$/.test(clean)) {
    throw new Error("Enter a 5-digit US ZIP code, or use your current location.");
  }

  const res = await fetch(`https://api.zippopotam.us/us/${clean}`, { signal });
  if (res.status === 404) throw new Error(`No US location found for ZIP ${clean}.`);
  if (!res.ok) throw new Error(`Location lookup failed (${res.status}).`);

  const data: ZippoResponse = await res.json();
  const place = data.places?.[0];
  if (!place?.latitude || !place?.longitude) {
    throw new Error(`No coordinates found for ZIP ${clean}.`);
  }

  return {
    lat: parseFloat(place.latitude),
    lng: parseFloat(place.longitude),
    label: `${place["place name"] ?? clean}, ${place.state ?? ""} ${clean}`.trim(),
  };
}

/** Resolve the browser's current position. Rejects if denied/unavailable. */
export function geolocate(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation isn't available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Current location",
        }),
      (err) => reject(new Error(err.message || "Couldn't get your location.")),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}

/** Great-circle distance between two points, in miles. */
export function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
