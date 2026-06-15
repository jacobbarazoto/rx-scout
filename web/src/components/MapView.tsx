import { Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import type { GeoLocation, Pharmacy, PharmacyResult } from "../types";
import type { KrogerStore } from "../lib/kroger";
import { AVAILABILITY_META } from "../lib/availability";
import PharmacyContact from "./PharmacyContact";

interface Props {
  center: GeoLocation;
  pharmacies: PharmacyResult[];
  krogerStores: KrogerStore[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onTransfer: (p: Pharmacy) => void;
}

// A Map ID is required for Advanced Markers. Override via VITE_GOOGLE_MAP_ID;
// Google's "DEMO_MAP_ID" works for development.
const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID";

/** Renders an interactive Google Map. Only mounted when a Maps key is set. */
export default function MapView({
  center,
  pharmacies,
  krogerStores,
  selectedId,
  onSelect,
  onClose,
  onTransfer,
}: Props) {
  const selected = pharmacies.find((p) => p.id === selectedId) ?? null;
  const selectedKroger =
    krogerStores.find((s) => s.id === selectedId && s.lat != null && s.lng != null) ?? null;

  return (
    <div className="map-wrap" id="rx-map">
      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: center.lat, lng: center.lng }}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
      >
        {pharmacies.map((p) => {
          const meta = AVAILABILITY_META[p.availability.level];
          const isSelected = p.id === selectedId;
          return (
            <AdvancedMarker
              key={p.id}
              position={{ lat: p.lat, lng: p.lng }}
              onClick={() => onSelect(p.id)}
              zIndex={isSelected ? 10 : 1}
            >
              <Pin
                background={meta.color}
                borderColor="#fff"
                glyphColor="#fff"
                scale={isSelected ? 1.3 : 1}
              />
            </AdvancedMarker>
          );
        })}

        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            pixelOffset={[0, -42]}
            onCloseClick={onClose}
            headerContent={<strong>{selected.name}</strong>}
          >
            <div className="iw">
              <div className="iw-addr">{selected.address}</div>
              <div className="iw-stock">
                <span
                  className="badge"
                  style={{ background: AVAILABILITY_META[selected.availability.level].color }}
                >
                  {AVAILABILITY_META[selected.availability.level].label}
                </span>
                {selected.availability.level !== "out_of_stock" && (
                  <span className="qty">{selected.availability.quantity} on hand*</span>
                )}
              </div>
              <PharmacyContact p={selected} onTransfer={onTransfer} />
            </div>
          </InfoWindow>
        )}

        {selectedKroger && (
          <AdvancedMarker
            position={{ lat: selectedKroger.lat!, lng: selectedKroger.lng! }}
            zIndex={20}
          >
            <Pin background="#0b7285" borderColor="#ffffff" glyphColor="#ffffff" scale={1.3} />
          </AdvancedMarker>
        )}
        {selectedKroger && (
          <InfoWindow
            position={{ lat: selectedKroger.lat!, lng: selectedKroger.lng! }}
            pixelOffset={[0, -46]}
            onCloseClick={onClose}
            headerContent={<strong>{selectedKroger.name.replace(/^(\S+) - \1/, "$1")}</strong>}
          >
            <div className="iw">
              <div className="iw-addr">{selectedKroger.address}</div>
              <div className="iw-kroger">
                <span className="badge" style={{ background: "#1a7f37" }}>
                  Real stock
                </span>
                <span className="qty">live price &amp; aisle in the panel above</span>
              </div>
              {/* No transfer button — OTC items don't need a prescription transfer. */}
              <PharmacyContact p={krogerAsPharmacy(selectedKroger)} />
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
}

// Adapt a Kroger store into the Pharmacy shape PharmacyContact expects, so its
// popup matches the pharmacy popup (phone, directions, View on Maps, transfer).
// Kroger gives a phone but no Google rating, so rating is left off.
function krogerAsPharmacy(s: KrogerStore): Pharmacy {
  const digits = (s.phone || "").replace(/\D/g, "");
  const phone =
    digits.length === 10
      ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      : s.phone || undefined;
  return {
    id: s.id ?? "kroger",
    name: s.name.replace(/^(\S+) - \1/, "$1"),
    address: s.address,
    lat: s.lat ?? 0,
    lng: s.lng ?? 0,
    phone,
    mapsUri: `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`,
  };
}
