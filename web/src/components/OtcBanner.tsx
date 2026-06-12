interface Props {
  drugName: string;
}

/** Shown when the searched drug is available over the counter (real openFDA data). */
export default function OtcBanner({ drugName }: Props) {
  const ingredient = drugName.split(/\s+/)[0];
  return (
    <div className="otc">
      <span className="otc-chip">OTC</span>
      <div className="otc-text">
        <span>
          <strong>{ingredient}</strong> is available <strong>over the counter</strong> — no
          prescription needed. Beyond pharmacies, you'll usually find it on the shelf at
          grocery and big-box retailers too.
        </span>
        <p className="source-note">Source: openFDA NDC Directory (api.fda.gov)</p>
      </div>
    </div>
  );
}
