import { Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import type { GeoLocation, PharmacyResult } from "../types";
import { AVAILABILITY_META } from "../lib/availability";
import PharmacyContact from "./PharmacyContact";

interface Props {
  center: GeoLocation;
  pharmacies: PharmacyResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

// A Map ID is required for Advanced Markers. Override via VITE_GOOGLE_MAP_ID;
// Google's "DEMO_MAP_ID" works for development.
const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID";

/** Renders an interactive Google Map. Only mounted when a Maps key is set. */
export default function MapView({ center, pharmacies, selectedId, onSelect, onClose }: Props) {
  const selected = pharmacies.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="map-wrap">
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
              <PharmacyContact p={selected} />
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
}
