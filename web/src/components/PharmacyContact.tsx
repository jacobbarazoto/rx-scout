import type { Pharmacy } from "../types";

/** Universal Google Maps directions link (no API key needed). */
export function directionsUrl(p: Pharmacy): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

/** Rating + phone (click-to-call) + directions, shared by the list and map popup. */
export default function PharmacyContact({ p }: { p: Pharmacy }) {
  return (
    <div className="contact">
      {p.rating !== undefined && <span className="rating">★ {p.rating.toFixed(1)}</span>}
      {p.phone ? (
        <a className="contact-link" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>
          {p.phone}
        </a>
      ) : (
        <span className="muted">Phone unavailable</span>
      )}
      <a className="contact-link" href={directionsUrl(p)} target="_blank" rel="noreferrer">
        Directions ↗
      </a>
      {p.mapsUri && (
        <a className="contact-link" href={p.mapsUri} target="_blank" rel="noreferrer">
          View on Maps ↗
        </a>
      )}
    </div>
  );
}
