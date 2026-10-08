import { NAV_ITEMS_BY_ROLE } from "./navigation.js";

// The Dashboard is where every role lands, so it can never be switched off.
const ALWAYS_ALLOWED = new Set(["/portal"]);

function pathKeysForRole(role) {
  const keys = new Set();
  for (const group of NAV_ITEMS_BY_ROLE[role] ?? []) {
    for (const item of group.items) {
      if (!ALWAYS_ALLOWED.has(item.to)) keys.add(item.to);
    }
  }
  return [...keys];
}

/**
 * The page key a pathname belongs to: the longest nav link that is the path
 * or a parent of it, so /support-staff/documents/archive is its own page
 * and /admin/applications/:id counts as Applications.
 */
function featureKeyForPath(role, pathname) {
  return pathKeysForRole(role)
    .filter((key) => pathname === key || pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function isPathBlocked(role, pathname, blockedFeatures) {
  if (!blockedFeatures?.length) return false;
  const key = featureKeyForPath(role, pathname);
  return key !== undefined && blockedFeatures.includes(key);
}
