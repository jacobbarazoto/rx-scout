import type { KrogerStore } from "../lib/kroger";

interface Props {
  stores: KrogerStore[];
  loading: boolean;
}

const STOCK_META: Record<string, { label: string; color: string }> = {
  HIGH: { label: "In stock", color: "#1a7f37" },
  LOW: { label: "Low stock", color: "#bf8700" },
  TEMPORARILY_OUT_OF_STOCK: { label: "Out of stock", color: "#cf222e" },
};

function stockMeta(level?: string | null) {
  return (level && STOCK_META[level]) || { label: "Availability unknown", color: "#656d76" };
}

/** REAL shelf stock + price at nearby Kroger-family stores (OTC items only). */
export default function KrogerStock({ stores, loading }: Props) {
  if (loading) {
    return <p className="kroger-loading">Checking real stock at Kroger stores near you…</p>;
  }
  if (!stores.length) return null;

  return (
    <section className="kroger">
      <div className="kroger-head">
        <span className="kroger-badge">REAL STOCK</span>
        <h3>On the shelf at Kroger near you</h3>
      </div>
      {stores.map((s, i) => (
        <div key={i} className="kroger-store">
          <div className="kroger-store-name">{s.name}</div>
          <div className="kroger-store-addr">{s.address}</div>
          <ul className="kroger-products">
            {s.products.map((p, j) => {
              const meta = stockMeta(p.stockLevel);
              return (
                <li key={j}>
                  <span className="kroger-prod">
                    {p.description}
                    {p.size ? ` · ${p.size}` : ""}
                  </span>
                  <span className="kroger-info">
                    {p.price != null && <span className="kroger-price">${p.price.toFixed(2)}</span>}
                    <span className="badge" style={{ background: meta.color }}>
                      {meta.label}
                    </span>
                    {p.aisle && <span className="kroger-aisle">{p.aisle}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="source-note">Source: Kroger Products API — live price &amp; store inventory</p>
    </section>
  );
}
