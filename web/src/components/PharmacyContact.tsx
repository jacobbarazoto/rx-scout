import type { Pharmacy } from "../types";

/** Universal Google Maps directions link (no API key needed). */
export function directionsUrl(p: Pharmacy): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

interface Props {
  p: Pharmacy;
  /** When provided, renders a "Request transfer" button targeting this pharmacy. */
  onTransfer?: (p: Pharmacy) => void;
}

/** Rating + phone (click-to-call) + directions, shared by the list and map popup. */
export default function PharmacyContact({ p, onTransfer }: Props) {
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
      {onTransfer && (
        <button
          type="button"
          className="transfer-btn"
          onClick={(e) => {
            e.stopPropagation();
            onTransfer(p);
          }}
        >
          Transfer here →
        </button>
      )}
    </div>
  );
}
