export default function Header() {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">
          <svg viewBox="0 0 64 64" aria-hidden="true">
            <path
              d="M32 3C19 3 9 13 9 26c0 16 23 35 23 35s23-19 23-35C55 13 45 3 32 3Z"
              fill="#0b7285"
            />
            <circle cx="32" cy="26" r="14" fill="#ffffff" />
            <text
              x="32"
              y="34"
              fontSize="22"
              fontFamily="Georgia, 'Times New Roman', serif"
              fontWeight="700"
              textAnchor="middle"
              fill="#0b7285"
            >
              ℞
            </text>
          </svg>
        </span>
        <div>
          <h1>rx-scout</h1>
          <p className="tagline">
            Find which pharmacies near you are likely to have your prescription.
          </p>
        </div>
      </div>
    </header>
  );
}
