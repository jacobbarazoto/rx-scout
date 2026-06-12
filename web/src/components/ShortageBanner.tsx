import { useState } from "react";
import type { ShortageStatus } from "../types";

interface Props {
  drugName: string;
  status: ShortageStatus;
}

/** Shows the REAL FDA national shortage status for the searched drug. */
export default function ShortageBanner({ drugName, status }: Props) {
  const [open, setOpen] = useState(false);
  const tone = status.inShortage ? "warn" : "ok";

  return (
    <div className={`shortage ${tone}`}>
      <div className="shortage-head">
        <span className="shortage-dot" aria-hidden />
        <div>
          <strong>{status.label}</strong>
          <span className="shortage-sub">
            {status.inShortage
              ? ` — FDA reports a current national shortage affecting ${drugName.split(/\s+/)[0]}.`
              : ` — the FDA has no current national shortage on record for ${drugName.split(/\s+/)[0]}.`}
          </span>
        </div>
        {status.records.length > 0 && (
          <button className="link" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide details" : "Details"}
          </button>
        )}
      </div>

      {open && (
        <ul className="shortage-details">
          {status.records.map((r, i) => (
            <li key={i}>
              <strong>{r.genericName}</strong> · {r.status} · {r.company}
              {r.reason ? <div className="muted">Reason: {r.reason}</div> : null}
              {r.updated ? <div className="muted">Updated: {r.updated}</div> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="source-note">Source: openFDA Drug Shortages (api.fda.gov)</p>
    </div>
  );
}
