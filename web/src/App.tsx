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
import { findPharmacies, placesAvailable } from "./lib/pharmacies";
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
  // Tracks the last viewport we fetched for, to skip redundant map-driven refreshes.
  const lastFetchRef = useRef<{ lat: number; lng: number; radius: number } | null>(null);
  const refreshTimer = useRef<number | null>(null);

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

  // Re-run the pharmacy search for the map's current center + visible radius
  // when the user pans/zooms. Debounced, and skipped for small moves.
  const onViewportChange = (v: { lat: number; lng: number; radiusMeters: number }) => {
    const current = result;
    if (!current) return;
    const last = lastFetchRef.current;
    if (!last) {
      // First idle after a search: calibrate the baseline viewport, don't refetch.
      lastFetchRef.current = { lat: v.lat, lng: v.lng, radius: v.radiusMeters };
      return;
    }
    const moved = distanceMiles(last, v);
    const ratio = v.radiusMeters / (last.radius || v.radiusMeters);
    if (moved < 0.4 && ratio > 0.75 && ratio < 1.33) return; // negligible change
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(async () => {
      lastFetchRef.current = { lat: v.lat, lng: v.lng, radius: v.radiusMeters };
      const area: GeoLocation = { lat: v.lat, lng: v.lng, label: "this area" };
      try {
        const pharmacies = await findPharmacies(area, v.radiusMeters);
        const withStock: PharmacyResult[] = pharmacies.map((p) => ({
          ...p,
          availability: simulateAvailability(p.id, current.medication.name, current.shortage.inShortage),
        }));
        setResult((r) => (r ? { ...r, location: area, pharmacies: withStock } : r));
        setSelectedId((prev) => (withStock.some((p) => p.id === prev) ? prev : null));
      } catch {
        /* leave existing results in place on failure */
      }
    }, 500);
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
            </div>

            <div className={`results-body ${placesAvailable() ? "with-map" : ""}`}>
              <PharmacyList
                pharmacies={result.pharmacies}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onTransfer={setTransferTarget}
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
