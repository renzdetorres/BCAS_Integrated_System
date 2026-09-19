// Single source of truth for status pill colors, so "Approved", "Verified",
// "Eligible" etc. read the same everywhere they appear across every portal.
const STATUS_COLOR_MAP = {
  approved: "green",
  verified: "green",
  eligible: "green",
  published: "green",
  active: "green",
  open: "green",
  qualified: "green",

  rejected: "red",
  flagged: "red",
  "not eligible": "red",
  noteligible: "red",
  "not qualified": "red",
  notqualified: "red",
  closed: "red",
  archived: "red",

  pending: "amber",
  "pending review": "amber",
  screening: "amber",
  "for interview": "amber",
  draft: "amber",
  submitted: "amber",

  "under review": "purple",
  underreview: "purple",

  "not uploaded": "gray",
  notuploaded: "gray",
  inactive: "gray",

  uploaded: "blue",
};

const COLOR_CLASSES = {
  green: "bg-status-greenBg text-status-green",
  red: "bg-status-redBg text-status-red",
  amber: "bg-status-amberBg text-[#9C6B12]",
  purple: "bg-status-purpleBg text-status-purple",
  gray: "bg-status-grayBg text-status-gray",
  blue: "bg-status-blueBg text-status-blue",
};

export function statusColorKey(status) {
  if (!status) return "gray";
  const normalized = String(status).trim().toLowerCase();
  return STATUS_COLOR_MAP[normalized] ?? "gray";
}

export function statusColorClasses(status) {
  return COLOR_CLASSES[statusColorKey(status)];
}
