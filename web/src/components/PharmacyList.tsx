import type { PharmacyResult } from "../types";
import { AVAILABILITY_META } from "../lib/availability";

interface Props {
  pharmacies: PharmacyResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function PharmacyList({ pharmacies, selectedId, onSelect }: Props) {
  return (
    <ul className="pharmacy-list">
      {pharmacies.map((p) => {
        const meta = AVAILABILITY_META[p.availability.level];
        return (
          <li
            key={p.id}
            className={`pharmacy-card ${selectedId === p.id ? "selected" : ""}`}
            onClick={() => onSelect(p.id)}
          >
            <div className="pharmacy-main">
              <div className="pharmacy-name">{p.name}</div>
              <div className="pharmacy-addr">{p.address}</div>
              <div className="pharmacy-meta">
                {p.distanceMiles !== undefined && (
                  <span>{p.distanceMiles.toFixed(1)} mi</span>
                )}
                <span className="dot-sep">·</span>
                <span>updated {p.availability.updatedLabel}</span>
              </div>
            </div>
            <div className="pharmacy-stock">
              <span className="badge" style={{ background: meta.color }}>
                {meta.label}
              </span>
              {p.availability.level !== "out_of_stock" && (
                <span className="qty">{p.availability.quantity} on hand*</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
