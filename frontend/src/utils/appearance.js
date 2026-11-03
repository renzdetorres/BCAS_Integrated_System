const STORAGE_KEY = "bcas.appearance";

/** The shipped look: light, the school's green-tinted neutrals, standard contrast, 100% size and scale. */
export const DEFAULT_APPEARANCE = {
  scheme: "light",
  temperature: "neutral",
  contrast: "standard",
  fontSize: "medium",
  scale: "100",
};

export const APPEARANCE_OPTIONS = {
  scheme: [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ],
  temperature: [
    { value: "cool", label: "Cool" },
    { value: "neutral", label: "Neutral" },
    { value: "warm", label: "Warm" },
  ],
  contrast: [
    { value: "standard", label: "Standard" },
    { value: "high", label: "High" },
  ],
  fontSize: [
    { value: "small", label: "Small", factor: 0.92 },
    { value: "medium", label: "Medium", factor: 1 },
    { value: "large", label: "Large", factor: 1.1 },
    { value: "xlarge", label: "Extra Large", factor: 1.22 },
  ],
  scale: [
    { value: "85", label: "Extra Small", percent: 85 },
    { value: "90", label: "Small", percent: 90 },
    { value: "100", label: "Default", percent: 100 },
    { value: "110", label: "Large", percent: 110 },
    { value: "120", label: "Extra Large", percent: 120 },
  ],
};

/**
 * CSS zoom shrinks the room the layout has, but the stylesheets still choose their layout from the
 * real window width. On a desktop-width window a big scale would squeeze a desktop layout into
 * fewer CSS pixels than it was built for (the top bar and tables spill sideways), so the scale is
 * held to what the window can fit. Smaller scales, and phone-width windows, are never limited.
 */
const DESKTOP_MIN_LAYOUT_WIDTH = 1000;
const DESKTOP_BREAKPOINT = 960;

function fittingScale(wanted) {
  const width = window.innerWidth;
  if (wanted <= 1 || width <= DESKTOP_BREAKPOINT) return wanted;
  return Math.max(1, Math.min(wanted, width / DESKTOP_MIN_LAYOUT_WIDTH));
}

function isAllowed(key, value) {
  return APPEARANCE_OPTIONS[key].some((option) => option.value === value);
}

/** Saved choices, with anything missing or unrecognised falling back to the default. */
export function loadAppearance() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && typeof saved === "object") {
      const next = { ...DEFAULT_APPEARANCE };
      for (const key of Object.keys(DEFAULT_APPEARANCE)) {
        if (isAllowed(key, saved[key])) next[key] = saved[key];
      }
      return next;
    }
  } catch {
    // Storage blocked or unreadable: use the default look.
  }
  return { ...DEFAULT_APPEARANCE };
}

export function saveAppearance(appearance) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Storage blocked (private window): the choice still applies until the page is closed.
  }
}

export function systemPrefersDark() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(appearance) {
  if (appearance.scheme === "system") return systemPrefersDark() ? "dark" : "light";
  return appearance.scheme;
}

/**
 * Writes the choices onto <html>. CSS does the rest: appearance.css keys its colour sets off the
 * data attributes, and the font and layout scales are the two custom properties that
 * build/appearanceScale.js wires every font size and viewport height to.
 */
export function applyAppearance(appearance) {
  const root = document.documentElement;
  const theme = resolveTheme(appearance);
  root.dataset.theme = theme;
  root.dataset.temperature = appearance.temperature;
  root.dataset.contrast = appearance.contrast;

  const font = APPEARANCE_OPTIONS.fontSize.find((option) => option.value === appearance.fontSize);
  const scale = APPEARANCE_OPTIONS.scale.find((option) => option.value === appearance.scale);
  root.style.setProperty("--font-scale", String(font?.factor ?? 1));
  root.style.setProperty("--layout-scale", String(fittingScale((scale?.percent ?? 100) / 100)));

  // Tells the browser to draw its own controls (scrollbars, date pickers, selects) to match.
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
}
