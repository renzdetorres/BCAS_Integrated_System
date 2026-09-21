// Minimal dependency-free icon set (stroke-based, inherits currentColor) used
// by the sidebar/topbar. Kept intentionally small - one path set per name.
const PATHS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
  doc: "M7 3h7l5 5v13H7V3Zm7 0v5h5",
  history: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v4l3 2",
  track: "M4 6h16M4 12h10M4 18h6M17 15l3 3-3 3",
  award: "M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-3 3-1 5 4-2 4 2-1-5",
  folder: "M3 6h6l2 2h10v11H3Z",
  calendar: "M4 5h16v16H4Zm0 5h16M8 3v4M16 3v4",
  ticket:
    "M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z",
  bell: "M6 9a6 6 0 1 1 12 0c0 4 1.5 5 1.5 5h-15S6 13 6 9Zm4 9a2 2 0 0 0 4 0",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.2-1.8l2-1.5-2-3.5-2.4.7a8 8 0 0 0-3.1-1.8L14 2h-4l-.3 2.1a8 8 0 0 0-3.1 1.8l-2.4-.7-2 3.5 2 1.5A8 8 0 0 0 4 12c0 .6.1 1.2.2 1.8l-2 1.6 2 3.4 2.4-.7a8 8 0 0 0 3.1 1.8L10 22h4l.3-2.1a8 8 0 0 0 3.1-1.8l2.4.7 2-3.4-2-1.6c.1-.6.2-1.2.2-1.8Z",
  archive: "M3 4h18v4H3ZM5 8v12h14V8M10 12h4",
  bookmark: "M6 3h12v18l-6-4-6 4Z",
  chart: "M4 20V10M12 20V4m8 16v-7",
  users: "M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21c0-3.3 2.7-6 6-6s6 2.7 6 6M14 15c3.3 0 6 2.7 6 6",
  "user-plus": "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21c0-3.3 2.7-6 6-6s6 2.7 6 6M19 8v6M22 11h-6",
  mail: "M4 5h16v14H4Zm0 0 8 7 8-7",
  menu: "M4 6h16M4 12h16M4 18h16",
  chevron: "m6 9 6 6 6-6",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5Z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  "eye-off":
    "M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a17.7 17.7 0 0 1-2.88 3.94M6.1 6.1C3.51 7.86 1 12 1 12s4 8 11 8a9.7 9.7 0 0 0 4.24-.98",
  check: "M20 6 9 17l-5-5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2",
  x: "M6 6l12 12M18 6 6 18",
  dash: "M5 12h14",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.9 3.1-7 7-7s7 3.1 7 7",
  "graduation-cap": "M12 3 2 8l10 5 10-5-10-5ZM6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
};

export default function Icon({ name, size = 18, className = "" }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
