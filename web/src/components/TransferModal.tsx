import { useMemo, useState } from "react";
import type { Pharmacy } from "../types";
import {
  buildCallScript,
  getTransferUrl,
  hasDirectTransferPage,
} from "../lib/transfers";

interface Props {
  destination: Pharmacy;
  medication: string;
  /** Nearby pharmacies, used to autocomplete the user's current pharmacy. */
  nearby: Pharmacy[];
  onClose: () => void;
}

export default function TransferModal({ destination, medication, nearby, onClose }: Props) {
  const [patientName, setPatientName] = useState("");
  const [dob, setDob] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [currentPhone, setCurrentPhone] = useState("");
  const [copied, setCopied] = useState(false);

  // If the typed current pharmacy matches a nearby one, prefill its phone.
  const onCurrentNameChange = (value: string) => {
    setCurrentName(value);
    const match = nearby.find(
      (p) => p.id !== destination.id && p.name.toLowerCase() === value.trim().toLowerCase(),
    );
    if (match?.phone) setCurrentPhone(match.phone);
  };

  const script = useMemo(
    () =>
      buildCallScript({
        patientName,
        dob,
        medication,
        destination,
        currentPharmacyName: currentName,
        currentPharmacyPhone: currentPhone,
      }),
    [patientName, dob, medication, destination, currentName, currentPhone],
  );

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable; the script is visible to copy manually */
    }
  };

  const transferUrl = getTransferUrl(destination.name);
  const telHref = destination.phone ? `tel:${destination.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="transfer-title">Transfer prescription to {destination.name}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="modal-sub">
          {destination.address} · for <strong>{medication}</strong>
        </p>

        <div className="modal-grid">
          <label className="modal-field">
            <span>Your name</span>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Full name"
            />
          </label>
          <label className="modal-field">
            <span>Date of birth</span>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </label>
          <label className="modal-field">
            <span>Current pharmacy</span>
            <input
              type="text"
              list="nearby-pharmacies"
              value={currentName}
              onChange={(e) => onCurrentNameChange(e.target.value)}
              placeholder="Where it's filled now"
            />
            <datalist id="nearby-pharmacies">
              {nearby
                .filter((p) => p.id !== destination.id)
                .map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
            </datalist>
          </label>
          <label className="modal-field">
            <span>Current pharmacy phone</span>
            <input
              type="tel"
              value={currentPhone}
              onChange={(e) => setCurrentPhone(e.target.value)}
              placeholder="Optional"
            />
          </label>
        </div>

        <p className="privacy-note">
          🔒 This stays in your browser — nothing is sent to rx-scout.
        </p>

        <div className="script-box">
          <div className="script-head">
            <span>Call script</span>
            <button className="link" onClick={copyScript}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre>{script}</pre>
        </div>

        <div className="modal-actions">
          {telHref && (
            <a className="action primary" href={telHref}>
              Call {destination.name}
            </a>
          )}
          <a className="action" href={transferUrl} target="_blank" rel="noreferrer">
            {hasDirectTransferPage(destination.name)
              ? "Transfer online ↗"
              : "Find transfer page ↗"}
          </a>
        </div>

        <p className="modal-foot">
          Transfers are completed by the pharmacy — they'll contact your current pharmacy
          to move the prescription. rx-scout just pre-fills the request.
        </p>
      </div>
    </div>
  );
}
