/**
 * The splash's progress. There is no byte count to report while a session is checked and a page's
 * code is fetched, so the figure is an honest estimate: it climbs quickly at first, slows as it
 * nears the end and never reaches 100 on its own. The splash disappearing is the "done".
 *
 * It runs off the browser's performance clock, so the first-paint splash in index.html (which
 * repeats these few lines) and the React splash that replaces it show the same number without
 * the figure restarting. A splash shown later (right after signing in) restarts it.
 */

const TAU_MS = 3200;
const CEILING = 94;

export const BOOT_STAGES = [
  { from: 0, label: "Starting up" },
  { from: 18, label: "Securing your session" },
  { from: 55, label: "Preparing your workspace" },
  { from: 80, label: "Loading the latest updates" },
];

/** The footer's three checkpoints light up as the figure passes each one. */
export const BOOT_STEPS = [
  { from: 18, label: "Secure sign-in" },
  { from: 55, label: "Your workspace" },
  { from: 80, label: "Latest updates" },
];

let origin = 0;
let firstBootFinished = false;

export function bootPercent(now = performance.now()) {
  const elapsed = Math.max(0, now - origin);
  return Math.min(CEILING, Math.round(100 * (1 - Math.exp(-elapsed / TAU_MS))));
}

export function bootStage(percent) {
  let label = BOOT_STAGES[0].label;
  for (const stage of BOOT_STAGES) if (percent >= stage.from) label = stage.label;
  return label;
}

/** Called when a splash appears: after the very first one, each new wait starts from zero. */
export function startBootClock() {
  if (firstBootFinished) origin = performance.now();
}

/** Called when a splash goes away. */
export function finishBootClock() {
  firstBootFinished = true;
}
