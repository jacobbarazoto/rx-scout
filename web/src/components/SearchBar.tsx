import { useEffect, useRef, useState } from "react";
import type { GeoLocation, Medication } from "../types";
import { searchMedications } from "../lib/rxnorm";
import { geocodeZip, geolocate } from "../lib/geo";
import { addRecentSearch, loadRecentSearches } from "../lib/history";

interface Props {
  onSearch: (medication: Medication, location: GeoLocation) => void;
  busy: boolean;
}

export default function SearchBar({ onSearch, busy }: Props) {
  const [medText, setMedText] = useState("");
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [suggestions, setSuggestions] = useState<Medication[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(loadRecentSearches()), []);

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
        setActiveIndex(-1); // reset highlight when fresh results arrive
      } catch {
        /* ignore transient autocomplete errors */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [medText, selectedMed]);

  // When the box is empty/short, the dropdown shows recent searches instead of
  // live autocomplete results.
  const recentMode = medText.trim().length < 2;
  const displayItems: Medication[] = recentMode
    ? recent.map((n) => ({ id: n, name: n }))
    : suggestions;
  const dropdownOpen = showSuggestions && displayItems.length > 0;

  const pickSuggestion = (m: Medication) => {
    setSelectedMed(m);
    setMedText(m.name);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  // Keyboard navigation for the dropdown (recent searches or autocomplete).
  const onMedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) return;
    const n = displayItems.length;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % n);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? n - 1 : i - 1));
        break;
      case "Enter":
        // Only intercept Enter when an item is highlighted; otherwise let the
        // form submit and run the search.
        if (activeIndex >= 0) {
          e.preventDefault();
          pickSuggestion(displayItems[activeIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setActiveIndex(-1);
        break;
    }
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

  const usingCurrentLocation = resolvedLoc?.label === "Current location";

  const clearLocation = () => {
    setResolvedLoc(null);
    setZip("");
    setLocError("");
    locationRef.current?.focus();
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
    setRecent(addRecentSearch(med.name));
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
          onKeyDown={onMedKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls="med-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `med-opt-${activeIndex}` : undefined}
        />
        {dropdownOpen && (
          <ul className="suggestions" role="listbox" id="med-suggestions">
            {recentMode && <li className="suggestions-label">Recent searches</li>}
            {displayItems.map((m, i) => (
              <li
                key={m.id}
                id={`med-opt-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={i === activeIndex ? "active" : undefined}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={() => pickSuggestion(m)}
              >
                {recentMode && <span className="recent-icon">🕘</span>}
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
            value={usingCurrentLocation ? "Current location" : zip}
            readOnly={usingCurrentLocation}
            onChange={(e) => {
              setZip(e.target.value);
              setResolvedLoc(null);
            }}
          />
          {usingCurrentLocation ? (
            <button
              type="button"
              className="ghost"
              onClick={clearLocation}
              title="Clear location"
              aria-label="Clear location"
            >
              ✕
            </button>
          ) : (
            <button
              type="button"
              className="ghost"
              onClick={useMyLocation}
              disabled={locating}
              title="Use my current location"
            >
              {locating ? "…" : "📍"}
            </button>
          )}
        </div>
      </div>

      <button type="submit" className="primary" disabled={busy}>
        {busy ? "Searching…" : "Search"}
      </button>

      {locError && <p className="form-error">{locError}</p>}
    </form>
  );
}
