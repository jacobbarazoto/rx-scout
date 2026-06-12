import type { KrogerStore } from "../lib/kroger";
import type { PharmacyResult } from "../types";
import { distanceMiles } from "../lib/geo";

interface Props {
  stores: KrogerStore[];
  loading: boolean;
  /** Pharmacy pins on the map, for matching a store to a marker. */
  pharmacies: PharmacyResult[];
  /** Select + highlight a pharmacy pin (and scroll the map into view). */
  onShowOnMap: (pharmacyId: string) => void;
}

const STOCK_META: Record<string, { label: string; color: string }> = {
  HIGH: { label: "In stock", color: "#1a7f37" },
  LOW: { label: "Low stock", color: "#bf8700" },
  TEMPORARILY_OUT_OF_STOCK: { label: "Out of stock", color: "#cf222e" },
};

function stockMeta(level?: string | null) {
  return (level && STOCK_META[level]) || { label: "Unknown", color: "#656d76" };
}

// Tidy duplicated brand prefixes, e.g. "Kroger - Kroger On the Rhine" → "Kroger On the Rhine".
function tidyName(name: string) {
  return name.replace(/^(\S+) - \1/, "$1");
}

// Find the map pin closest to a store's coordinates, within ~0.3 mi.
function matchPharmacy(store: KrogerStore, pharmacies: PharmacyResult[]): PharmacyResult | null {
  if (store.lat == null || store.lng == null) return null;
  let best: PharmacyResult | null = null;
  let bestDist = Infinity;
  for (const p of pharmacies) {
    const d = distanceMiles({ lat: store.lat, lng: store.lng }, p);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best && bestDist <= 0.3 ? best : null;
}

/** REAL shelf stock + price at nearby Kroger-family stores (OTC items only). */
export default function KrogerStock({ stores, loading, pharmacies, onShowOnMap }: Props) {
  if (loading) {
    return <p className="kroger-loading">Checking real stock at stores near you…</p>;
  }
  if (!stores.length) return null;

  return (
    <div className="kroger">
      {stores.map((s, i) => {
        const match = matchPharmacy(s, pharmacies);
        return (
          <details key={i} className="kroger-store">
            <summary className="kroger-summary">
              <span className="kroger-badge">REAL STOCK</span>
              <span className="kroger-summary-text">
                On the shelf at <strong>{tidyName(s.name)}</strong> near you
              </span>
              {match && (
                <button
                  type="button"
                  className="kroger-maplink"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onShowOnMap(match.id);
                  }}
                >
                  Show on map
                </button>
              )}
              <span className="kroger-chevron" aria-hidden />
            </summary>
            <div className="kroger-body">
              <div className="kroger-store-addr">{s.address}</div>
              <table className="kroger-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Aisle</th>
                  </tr>
                </thead>
                <tbody>
                  {s.products.map((p, j) => {
                    const meta = stockMeta(p.stockLevel);
                    return (
                      <tr key={j}>
                        <td>
                          {p.description}
                          {p.size ? <span className="kroger-size"> · {p.size}</span> : null}
                        </td>
                        <td>{p.price != null ? `$${p.price.toFixed(2)}` : "—"}</td>
                        <td>
                          <span className="badge" style={{ background: meta.color }}>
                            {meta.label}
                          </span>
                        </td>
                        <td>{p.aisle || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="source-note">Source: Kroger Products API — live price &amp; inventory</p>
            </div>
          </details>
        );
      })}
    </div>
  );
}
