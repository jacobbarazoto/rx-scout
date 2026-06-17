import { useEffect, useRef, useState } from "react";
import type { Pharmacy, PharmacyResult } from "../types";
import { AVAILABILITY_META } from "../lib/availability";
import PharmacyContact from "./PharmacyContact";

interface Props {
  pharmacies: PharmacyResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTransfer: (p: Pharmacy) => void;
  /** Fetch more pharmacies from the area (Text Search). */
  onLoadMore: () => void;
  loadingMore: boolean;
  /** True once a "show more" returned nothing new. */
  noMore: boolean;
}

const PAGE = 10;

export default function PharmacyList({
  pharmacies,
  selectedId,
  onSelect,
  onTransfer,
  onLoadMore,
  loadingMore,
  noMore,
}: Props) {
  const [visible, setVisible] = useState(PAGE);
  const sentinelRef = useRef<HTMLLIElement | null>(null);

  // Reset paging on a new result set.
  useEffect(() => setVisible(PAGE), [pharmacies]);

  // Make sure a selected pharmacy (e.g. clicked on the map) is revealed.
  useEffect(() => {
    if (!selectedId) return;
    const idx = pharmacies.findIndex((p) => p.id === selectedId);
    if (idx >= 0) setVisible((v) => Math.max(v, Math.ceil((idx + 1) / PAGE) * PAGE));
  }, [selectedId, pharmacies]);

  // Infinite scroll: reveal the next page as the sentinel scrolls into view.
  const hasMore = visible < pharmacies.length;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!hasMore || !el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => Math.min(v + PAGE, pharmacies.length));
        }
      },
      { rootMargin: "150px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, pharmacies.length]);

  return (
    <ul className="pharmacy-list">
      {pharmacies.slice(0, visible).map((p) => {
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
      {hasMore ? (
        // More already-fetched results to reveal — auto-load on scroll.
        <li ref={sentinelRef} className="pharmacy-more">
          <button
            type="button"
            className="link"
            onClick={() => setVisible((v) => Math.min(v + PAGE, pharmacies.length))}
          >
            Show {Math.min(PAGE, pharmacies.length - visible)} more
          </button>
        </li>
      ) : noMore ? (
        <li className="pharmacy-more pharmacy-more-done">No more pharmacies found nearby.</li>
      ) : (
        // All fetched results shown — offer a wider Text Search of the area.
        <li className="pharmacy-more">
          <button type="button" className="link" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Searching…" : "Show more from the area"}
          </button>
        </li>
      )}
    </ul>
  );
}
