import type { Pharmacy, PharmacyResult } from "../types";
import { AVAILABILITY_META } from "../lib/availability";
import PharmacyContact from "./PharmacyContact";

interface Props {
  pharmacies: PharmacyResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTransfer: (p: Pharmacy) => void;
}

export default function PharmacyList({ pharmacies, selectedId, onSelect, onTransfer }: Props) {
  return (
    <ul className="pharmacy-list">
      {pharmacies.map((p) => {
        const meta = AVAILABILITY_META[p.availability.level];
        const selected = selectedId === p.id;
        return (
          <li
            key={p.id}
            className={`pharmacy-card ${selected ? "selected" : ""}`}
            onClick={() => onSelect(p.id)}
          >
            <div className="pharmacy-row">
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
            </div>
            {selected && <PharmacyContact p={p} onTransfer={onTransfer} />}
          </li>
        );
      })}
    </ul>
  );
}
