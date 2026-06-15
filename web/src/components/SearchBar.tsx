import { useEffect, useRef, useState } from "react";
import type { GeoLocation, Medication } from "../types";
import { searchMedications } from "../lib/rxnorm";
import { geocodeZip, geolocate } from "../lib/geo";
import {
  addRecentSearch,
  loadRecentSearches,
  removeRecentSearch,
  type RecentSearch,
} from "../lib/history";

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
  const [recent, setRecent] = useState<RecentSearch[]>([]);
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
  const navLength = recentMode ? recent.length : suggestions.length;
  const dropdownOpen = showSuggestions && navLength > 0;

  const pickSuggestion = (m: Medication) => {
    setSelectedMed(m);
    setMedText(m.name);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  // Restore a past search into both boxes (medication + location).
  const pickRecent = (item: RecentSearch) => {
    setSelectedMed(item.medication);
    setMedText(item.medication.name);
    if (item.zip) {
      setZip(item.zip);
      setResolvedLoc(null);
    } else {
      setResolvedLoc(item.location);
      setZip("");
    }
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const removeRecent = (index: number) => {
    setRecent(removeRecentSearch(index));
    setActiveIndex(-1);
  };

  // Keyboard navigation for the dropdown (recent searches or autocomplete).
  const onMedKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % navLength);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? navLength - 1 : i - 1));
        break;
      case "Enter":
        // Only intercept Enter when an item is highlighted; otherwise let the
        // form submit and run the search.
        if (activeIndex >= 0) {
          e.preventDefault();
          if (recentMode) pickRecent(recent[activeIndex]);
          else pickSuggestion(suggestions[activeIndex]);
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
    // Cache only complete searches (both medication and location resolved).
    setRecent(
      addRecentSearch({
        medication: med,
        zip: loc.label === "Current location" ? undefined : zip.trim() || undefined,
        location: loc,
      }),
    );
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
            {recentMode ? (
              <>
                <li className="suggestions-label">Recent searches</li>
                {recent.map((item, i) => (
                  <li
                    key={`${item.medication.name}|${item.zip ?? item.location.label}`}
                    id={`med-opt-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    className={`recent-item ${i === activeIndex ? "active" : ""}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={() => pickRecent(item)}
                  >
                    <span className="recent-text">
                      {item.medication.name} <span className="dot-sep">•</span>{" "}
                      {item.zip ?? item.location.label}
                    </span>
                    <button
                      type="button"
                      className="recent-remove"
                      aria-label="Remove from history"
                      title="Remove"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeRecent(i);
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </>
            ) : (
              suggestions.map((m, i) => (
                <li
                  key={m.id}
                  id={`med-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={i === activeIndex ? "active" : undefined}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={() => pickSuggestion(m)}
                >
                  {m.name}
                </li>
              ))
            )}
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
