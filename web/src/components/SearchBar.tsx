import { useEffect, useRef, useState } from "react";
import type { GeoLocation, Medication } from "../types";
import { searchMedications } from "../lib/rxnorm";
import { geocodeZip, geolocate } from "../lib/geo";

interface Props {
  onSearch: (medication: Medication, location: GeoLocation) => void;
  busy: boolean;
}

export default function SearchBar({ onSearch, busy }: Props) {
  const [medText, setMedText] = useState("");
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [suggestions, setSuggestions] = useState<Medication[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [zip, setZip] = useState("");
  const [locError, setLocError] = useState("");
  const [locating, setLocating] = useState(false);
  const [resolvedLoc, setResolvedLoc] = useState<GeoLocation | null>(null);

  // Debounced medication autocomplete.
  useEffect(() => {
    if (selectedMed && selectedMed.name === medText) return; // already chosen
    const q = medText.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setSuggestions(await searchMedications(q, controller.signal));
        setShowSuggestions(true);
      } catch {
        /* ignore transient autocomplete errors */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [medText, selectedMed]);

  const pickSuggestion = (m: Medication) => {
    setSelectedMed(m);
    setMedText(m.name);
    setShowSuggestions(false);
  };

  const useMyLocation = async () => {
    setLocError("");
    setLocating(true);
    try {
      const loc = await geolocate();
      setResolvedLoc(loc);
      setZip("");
    } catch (e) {
      setLocError((e as Error).message);
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocError("");

    const med: Medication = selectedMed ?? { id: medText.trim(), name: medText.trim() };
    if (!med.name) return;

    let loc = resolvedLoc;
    // If the user typed a ZIP instead of using "current location", resolve it now.
    if (!loc || (zip && resolvedLoc?.label !== "Current location")) {
      try {
        loc = await geocodeZip(zip);
      } catch (err) {
        setLocError((err as Error).message);
        return;
      }
    }
    onSearch(med, loc);
  };

  const locationRef = useRef<HTMLInputElement>(null);

  return (
    <form className="search-bar" onSubmit={submit} autoComplete="off">
      <div className="field med-field">
        <label htmlFor="med">Medication</label>
        <input
          id="med"
          type="text"
          placeholder="e.g. atorvastatin"
          value={medText}
          onChange={(e) => {
            setMedText(e.target.value);
            setSelectedMed(null);
          }}
          onFocus={() => suggestions.length && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="suggestions" role="listbox">
            {suggestions.map((m) => (
              <li key={m.id} role="option" onMouseDown={() => pickSuggestion(m)}>
                {m.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="field">
        <label htmlFor="zip">Location</label>
        <div className="loc-row">
          <input
            id="zip"
            ref={locationRef}
            type="text"
            inputMode="numeric"
            placeholder="ZIP code"
            value={resolvedLoc?.label === "Current location" ? "Current location" : zip}
            readOnly={resolvedLoc?.label === "Current location"}
            onChange={(e) => {
              setZip(e.target.value);
              setResolvedLoc(null);
            }}
          />
          <button
            type="button"
            className="ghost"
            onClick={useMyLocation}
            disabled={locating}
            title="Use my current location"
          >
            {locating ? "…" : "📍"}
          </button>
        </div>
      </div>

      <button type="submit" className="primary" disabled={busy}>
        {busy ? "Searching…" : "Search"}
      </button>

      {locError && <p className="form-error">{locError}</p>}
    </form>
  );
}
