import { useEffect, useRef, useState } from "react";
import type {
  GeoLocation,
  Medication,
  Pharmacy,
  PharmacyResult,
  ShortageStatus,
} from "./types";
import { getShortageStatus } from "./lib/openfda";
import { getOtcStatus } from "./lib/otc";
import { getKrogerStock, type KrogerStore } from "./lib/kroger";
import { findPharmacies, placesAvailable, searchMorePharmacies } from "./lib/pharmacies";
import { simulateAvailability } from "./lib/availability";
import { distanceMiles } from "./lib/geo";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import ShortageBanner from "./components/ShortageBanner";
import OtcBanner from "./components/OtcBanner";
import KrogerStock from "./components/KrogerStock";
import PharmacyList from "./components/PharmacyList";
import MapView from "./components/MapView";
import TransferModal from "./components/TransferModal";
import "./App.css";

interface SearchResult {
  medication: Medication;
  location: GeoLocation;
  shortage: ShortageStatus;
  pharmacies: PharmacyResult[];
  isOtc: boolean;
}

export default function App() {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<Pharmacy | null>(null);
  const [krogerStores, setKrogerStores] = useState<KrogerStore[]>([]);
  const [krogerLoading, setKrogerLoading] = useState(false);
  // Explicit search location — the map pans here on a new search (not on user pans).
  const [recenterTo, setRecenterTo] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  // The location the user actually entered, so we can offer "back to original".
  const [originLocation, setOriginLocation] = useState<GeoLocation | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [areaBusy, setAreaBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMore, setNoMore] = useState(false);
  // Baseline viewport we last fetched for, and the latest reported map viewport.
  const lastFetchRef = useRef<{ lat: number; lng: number; radius: number } | null>(null);
  const viewportRef = useRef<{ lat: number; lng: number; radiusMeters: number } | null>(null);
  // Radius used for the current result set (for "show more" Text Search).
  const searchRadiusRef = useRef(8000);

  // For OTC drugs, look up real shelf stock at nearby Kroger-family stores.
  useEffect(() => {
    setKrogerStores([]);
    if (!result?.isOtc) return;
    const controller = new AbortController();
    let active = true;
    setKrogerLoading(true);
    getKrogerStock(result.medication.name, result.location, controller.signal)
      .then((stores) => active && setKrogerStores(stores.map((s, i) => ({ ...s, id: `kroger-${i}` }))))
      .catch(() => {})
      .finally(() => active && setKrogerLoading(false));
    return () => {
      active = false;
      controller.abort();
    };
  }, [result]);

  // Select a pharmacy pin (highlights it + opens its map popup) and scroll the
  // map into view — used by the Kroger "Show on map" links.
  const showOnMap = (pharmacyId: string) => {
    setSelectedId(pharmacyId);
    requestAnimationFrame(() =>
      document.getElementById("rx-map")?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };

  // Track the map's viewport; surface a "Search this area" button when it has
  // moved/zoomed meaningfully from what we last searched (no auto-refetch).
  const onViewportChange = (v: { lat: number; lng: number; radiusMeters: number }) => {
    if (!result) return;
    viewportRef.current = v;
    const last = lastFetchRef.current;
    if (!last) {
      // First idle after a search: calibrate the baseline viewport.
      lastFetchRef.current = { lat: v.lat, lng: v.lng, radius: v.radiusMeters };
      setShowSearchArea(false);
      return;
    }
    const moved = distanceMiles(last, v);
    const ratio = v.radiusMeters / (last.radius || v.radiusMeters);
    setShowSearchArea(moved >= 0.4 || ratio <= 0.75 || ratio >= 1.33);
  };

  // Re-run the pharmacy search for the current map viewport (button-driven).
  const searchThisArea = async () => {
    const v = viewportRef.current;
    const current = result;
    if (!v || !current) return;
    setAreaBusy(true);
    const area: GeoLocation = { lat: v.lat, lng: v.lng, label: "this area" };
    try {
      const pharmacies = await findPharmacies(area, v.radiusMeters);
      const withStock: PharmacyResult[] = pharmacies.map((p) => ({
        ...p,
        availability: simulateAvailability(p.id, current.medication.name, current.shortage.inShortage),
      }));
      lastFetchRef.current = { lat: v.lat, lng: v.lng, radius: v.radiusMeters };
      searchRadiusRef.current = v.radiusMeters;
      setShowSearchArea(false);
      setNoMore(false);
      setResult((r) => (r ? { ...r, location: area, pharmacies: withStock } : r));
      setSelectedId((prev) => (withStock.some((p) => p.id === prev) ? prev : null));
    } catch {
      /* leave existing results in place on failure */
    } finally {
      setAreaBusy(false);
    }
  };

  // Re-run the original entered search (location + medication).
  const resetToOrigin = () => {
    if (originLocation && result) handleSearch(result.medication, originLocation);
  };

  // Best-effort "show more": Text Search the area for pharmacies beyond the
  // Nearby Search cap, append the new ones (deduped).
  const loadMorePharmacies = async () => {
    const current = result;
    if (!current) return;
    setLoadingMore(true);
    try {
      const existing = new Set(current.pharmacies.map((p) => p.id));
      const more = await searchMorePharmacies(current.location, searchRadiusRef.current, existing);
      if (!more.length) {
        setNoMore(true);
        return;
      }
      const withStock: PharmacyResult[] = more.map((p) => ({
        ...p,
        availability: simulateAvailability(p.id, current.medication.name, current.shortage.inShortage),
      }));
      setResult((r) =>
        r
          ? {
              ...r,
              pharmacies: [...r.pharmacies, ...withStock].sort(
                (a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0),
              ),
            }
          : r,
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSearch = async (medication: Medication, location: GeoLocation) => {
    setBusy(true);
    setError("");
    try {
      // Real FDA shortage status, OTC status, and nearby pharmacies, in parallel.
      const [shortage, otc, pharmacies] = await Promise.all([
        getShortageStatus(medication.name),
        getOtcStatus(medication.name),
        findPharmacies(location),
      ]);

      // Layer simulated availability on top, biased by the real shortage signal.
      const withStock: PharmacyResult[] = pharmacies.map((p) => ({
        ...p,
        availability: simulateAvailability(p.id, medication.name, shortage.inShortage),
      }));

      setResult({ medication, location, shortage, pharmacies: withStock, isOtc: otc.isOtc });
      setSelectedId(withStock[0]?.id ?? null);
      setRecenterTo({ lat: location.lat, lng: location.lng });
      setOriginLocation(location);
      setShowSearchArea(false);
      setNoMore(false);
      searchRadiusRef.current = 8000;
      lastFetchRef.current = null; // first map idle will calibrate the baseline
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <Header />
      <main>
        <SearchBar onSearch={handleSearch} busy={busy} />

        {error && <p className="app-error">{error}</p>}

        {result && (
          <section className="results">
            <div className="banners">
              <ShortageBanner drugName={result.medication.name} status={result.shortage} />
              {result.isOtc && <OtcBanner drugName={result.medication.name} />}
            </div>
            {result.isOtc && (
              <KrogerStock
                stores={krogerStores}
                loading={krogerLoading}
                hasMap={placesAvailable()}
                onShowOnMap={showOnMap}
              />
            )}

            <div className="results-head">
              <h2>
                {result.pharmacies.length} pharmacies near {result.location.label}
              </h2>
              {originLocation && result.location.label !== originLocation.label && (
                <button className="link reset-link" onClick={resetToOrigin}>
                  ↩ Back to {originLocation.label}
                </button>
              )}
            </div>

            <div className={`results-body ${placesAvailable() ? "with-map" : ""}`}>
              <PharmacyList
                pharmacies={result.pharmacies}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onTransfer={setTransferTarget}
                onLoadMore={loadMorePharmacies}
                loadingMore={loadingMore}
                noMore={noMore}
              />
              {placesAvailable() && (
                <MapView
                  center={result.location}
                  pharmacies={result.pharmacies}
                  krogerStores={krogerStores}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onClose={() => setSelectedId(null)}
                  onTransfer={setTransferTarget}
                  recenterTo={recenterTo}
                  onViewportChange={onViewportChange}
                  showSearchArea={showSearchArea}
                  onSearchArea={searchThisArea}
                  areaBusy={areaBusy}
                />
              )}
            </div>

            <p className="disclaimer">
              * Per-pharmacy stock levels are <strong>simulated</strong> — no public API
              exposes live prescription inventory. Shortage status above is real FDA data.
              Always call ahead to confirm availability.
            </p>
          </section>
        )}

        {!result && !busy && (
          <p className="empty-hint">
            Search a medication and a location to see nearby pharmacies and current FDA
            shortage status.
          </p>
        )}
      </main>
      <footer className="app-footer">
        Built by Jacob Barazoto · Data: openFDA, RxNorm
        {placesAvailable() ? ", Google Places" : ""}
      </footer>

      {transferTarget && result && (
        <TransferModal
          destination={transferTarget}
          medication={result.medication.name}
          nearby={result.pharmacies}
          onClose={() => setTransferTarget(null)}
        />
      )}
    </div>
  );
}
