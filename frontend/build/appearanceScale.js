/**
 * PostCSS plugin behind the Appearance settings (Font size and Layout scale).
 *
 * The stylesheets size type in px and heights in vh, which a setting cannot reach. This makes
 * every such value follow two custom properties at build time, so no page stylesheet changes:
 *
 *   font-size / font   Npx   ->  calc(Npx * var(--font-scale, 1))
 *   any height in vh   Nvh   ->  calc(Nvh / var(--layout-scale, 1))
 *
 * Both properties are 1 by default, so the result is identical to the source until a person
 * changes a setting. Layout scale is CSS `zoom` on <html>, and `zoom` does not touch viewport
 * units, so a "100vh" panel would be taller than the window at 120%; dividing by the scale
 * keeps it exactly one window high.
 */

const PX = /(-?\d*\.?\d+)px/g;
const VH = /(-?\d*\.?\d+)((?:d|s|l)?vh)\b/g;
// A custom property that holds a font shorthand, e.g. --text-body: 400 14px/1.55 var(--font-sans);
const FONT_SHORTHAND_TOKEN = /^\s*(?:(?:italic|oblique|normal)\s+)?(?:[1-9]00|normal|bold)\s+-?\d*\.?\d+px\b/;

function scaleFontSize(value) {
  return value.replace(PX, (_match, number) => `calc(${number}px * var(--font-scale, 1))`);
}

/** In the `font` shorthand only the first size is the font size; a size after "/" is the line height. */
function scaleFontShorthand(value) {
  let done = false;
  return value.replace(/(^|[^/\d.])(-?\d*\.?\d+)px\b/, (match, before, number) => {
    if (done) return match;
    done = true;
    return `${before}calc(${number}px * var(--font-scale, 1))`;
  });
}

export default function appearanceScale() {
  return {
    postcssPlugin: "bcas-appearance-scale",
    Declaration(decl) {
      const { prop, value } = decl;
      if (value.includes("--font-scale") || value.includes("--layout-scale")) return;

      if (prop === "font-size" && PX.test(value)) {
        PX.lastIndex = 0;
        decl.value = scaleFontSize(value);
        return;
      }
      PX.lastIndex = 0;

      if (prop === "font" && /\d\s*px\b/.test(value)) {
        decl.value = scaleFontShorthand(value);
        return;
      }

      if (prop.startsWith("--") && FONT_SHORTHAND_TOKEN.test(value)) {
        decl.value = scaleFontShorthand(value);
        return;
      }

      if (/vh\b/.test(value) && !prop.startsWith("--")) {
        VH.lastIndex = 0;
        if (VH.test(value)) {
          VH.lastIndex = 0;
          decl.value = value.replace(VH, (_match, number, unit) => `calc(${number}${unit} / var(--layout-scale, 1))`);
        }
        VH.lastIndex = 0;
      }
    },
  };
}
appearanceScale.postcss = true;
