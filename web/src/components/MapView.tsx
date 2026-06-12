import { Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import type { GeoLocation, PharmacyResult } from "../types";
import { AVAILABILITY_META } from "../lib/availability";

interface Props {
  center: GeoLocation;
  pharmacies: PharmacyResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// A Map ID is required for Advanced Markers. Override via VITE_GOOGLE_MAP_ID;
// Google's "DEMO_MAP_ID" works for development.
const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID";

/** Renders an interactive Google Map. Only mounted when a Maps key is set. */
export default function MapView({ center, pharmacies, selectedId, onSelect }: Props) {
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
          const selected = p.id === selectedId;
          return (
            <AdvancedMarker
              key={p.id}
              position={{ lat: p.lat, lng: p.lng }}
              onClick={() => onSelect(p.id)}
              zIndex={selected ? 10 : 1}
            >
              <Pin
                background={meta.color}
                borderColor="#fff"
                glyphColor="#fff"
                scale={selected ? 1.3 : 1}
              />
            </AdvancedMarker>
          );
        })}
      </Map>
    </div>
  );
}
