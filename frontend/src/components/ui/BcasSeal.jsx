/**
 * A custom institutional seal (concentric rings + the school name curved
 * along the inner rim + an open-book emblem) - used wherever the app names
 * itself (sidebar brand, auth screens) instead of a generic outline icon.
 * Pure inline SVG, no external asset, inherits color from its parent.
 */
export default function BcasSeal({ size = 36 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <path id="bcas-seal-arc" d="M 50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" strokeWidth="1" />
      <text fontSize="9.5" fontWeight="700" letterSpacing="3.2" fill="currentColor">
        <textPath href="#bcas-seal-arc" startOffset="4.5%">
          BCAS
        </textPath>
      </text>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 39v26" />
        <path d="M50 41c-5.5-4-14-4-20 0v22c6-4 14.5-4 20 0" />
        <path d="M50 41c5.5-4 14-4 20 0v22c-6-4-14.5-4-20 0" />
      </g>
    </svg>
  );
}
