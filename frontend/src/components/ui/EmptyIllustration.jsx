/**
 * The empty-state picture: a sheet of paper with a few lines, a small gold dot and a green check
 * badge ("nothing waiting, nothing wrong"). Drawn with the theme's tokens, so it follows the
 * colour scheme.
 */
export default function EmptyIllustration({ size = 96 }) {
  return (
    <svg
      className="empty-illustration"
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="20" cy="22" r="3.4" fill="var(--color-accent)" />
      <rect x="25" y="12" width="46" height="62" rx="8" fill="var(--color-surface)" stroke="var(--color-border-strong)" strokeWidth="2" />
      <rect x="32" y="17" width="32" height="52" rx="5" fill="var(--color-surface-subtle)" opacity="0.7" />
      <path d="M36 28h24M36 37h24M36 46h14" stroke="var(--color-border-strong)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="68" cy="68" r="12" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="3" />
      <path d="m62.4 68.2 4 4 7.2-8" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
