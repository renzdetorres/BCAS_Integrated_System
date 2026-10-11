import { PATHS } from "../components/ui/Icon.jsx";

/**
 * Icon-only buttons, app-wide.
 *
 * Every action button is shown as a single icon. Its written label is never
 * lost: it stays in the DOM (hidden visually), is copied to aria-label so
 * screen readers still announce it, and is shown as a tooltip on hover/focus.
 * The icon is picked from the label, so "Delete" gets a bin and "Save" a disk,
 * and it follows the label as it changes ("Save" -> "Saving..." -> spinner).
 * A button whose label matches no rule is left as text rather than guessed.
 *
 * Pure DOM + CSS masks - React never sees these attributes, so reconciliation
 * is untouched. Styles live in styles/iconButtons.css.
 */

const SELECTOR = [
  ".btn",
  ".ui-button",
  ".auth-submit",
  ".reason-submit",
  ".reason-cancel",
  ".edit-trigger",
  ".edit-cancel",
  ".action-approve",
  ".next-action-button",
  ".workflow-advance-button",
  ".archive-submit-button",
  ".contract-print-button",
  ".inquiry-toggle-status",
  ".inquiry-detail-back-link",
  ".admin-app-detail-back-link",
  ".dash-intro-cta",
  ".history-action",
].join(",");

// First match wins, so specific phrases come before general verbs.
const RULES = [
  [/hide/, "eye-off"],
  [/back to|^back\b/, "arrow-left"],
  [/go to login|log ?in|sign ?in/, "log-in"],
  [/register|create account|sign ?up/, "user-plus"],
  [/send|reply/, "send"],
  [/reset password|change password|forgot|reset link/, "key"],
  [/reschedule/, "calendar"],
  [/schedule/, "calendar-check"],
  [/release|permit/, "ticket"],
  [/reopen|update status|refresh/, "refresh"],
  [/reject|decline|deny/, "x-circle"],
  [/cancel|close|dismiss/, "x"],
  [/delete|remove/, "trash"],
  [/clear|reset/, "rotate-ccw"],
  [/save/, "save"],
  [/verify|verdict/, "shield-check"],
  [/confirm|approve|accept|resolved|resolve|mark/, "check"],
  [/edit|rename/, "pencil"],
  [/archive/, "archive"],
  [/export|download/, "download"],
  [/upload/, "upload"],
  [/print/, "printer"],
  [/search/, "search"],
  [/report/, "chart"],
  [/checklist/, "clipboard"],
  [/document|file/, "folder"],
  [/contract/, "doc"],
  [/submit|apply/, "send"],
  [/advance|next|continue|open/, "arrow-right"],
  [/add|create|new/, "plus"],
  [/view|details|receipt|manage|show/, "eye"],
];

const BUSY = /(\.{3}|…)\s*$/;

function iconFor(label) {
  if (BUSY.test(label)) return "loader";
  const key = label.toLowerCase();
  for (const [pattern, icon] of RULES) {
    if (pattern.test(key) && PATHS[icon]) return icon;
  }
  return null;
}

function cleanLabel(text) {
  return text
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function apply(el) {
  const label = cleanLabel(el.textContent || "");
  if (!label) return; // already icon-only (or empty): nothing to derive

  const authored = el.hasAttribute("data-icon") && el.getAttribute("data-icon-src") !== "auto";
  const icon = authored ? el.getAttribute("data-icon") : iconFor(label);
  if (!icon) return;

  if (!authored) {
    el.setAttribute("data-icon-src", "auto");
    el.setAttribute("data-icon", icon);
  }
  el.setAttribute("data-label", label.replace(BUSY, ""));

  // Only overwrite aria-label if we wrote it - never clobber one a component set.
  const current = el.getAttribute("aria-label");
  if (current === null || current === el.getAttribute("data-auto-label")) {
    el.setAttribute("aria-label", label);
    el.setAttribute("data-auto-label", label);
  }
}

function scan() {
  document.querySelectorAll(SELECTOR).forEach(apply);
}

function injectIconStyles() {
  const rules = Object.entries(PATHS).map(([name, d]) => {
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' " +
      `stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'><path d='${d}'/></svg>`;
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    return `[data-icon="${name}"]::before{-webkit-mask-image:${url};mask-image:${url}}`;
  });
  const style = document.createElement("style");
  style.setAttribute("data-icon-buttons", "");
  style.textContent = rules.join("\n");
  document.head.appendChild(style);
}

export function initIconButtons() {
  injectIconStyles();
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  };
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "disabled"],
  });
  scan();
}
