const KEY = "bcas.session.expiresAt";

/**
 * How long a sign-in lasts. This mirrors the API's Jwt:ExpiryMinutes (60); the login is a fixed
 * lifetime that activity does not extend. The browser cannot read the HttpOnly cookie, so the
 * moment of sign-in is noted here and the session warning counts down from it. The server stays
 * the authority: before the warning says the session has ended, it asks the server.
 */
export const SESSION_MINUTES = 60;

/** Called whenever the API issues a fresh login: at sign-in and after a password change. */
export function markSessionStart() {
  try {
    localStorage.setItem(KEY, String(Date.now() + SESSION_MINUTES * 60_000));
  } catch {
    // Storage blocked: no warning is shown, and the session still works as before.
  }
}

/** When this sign-in ends (ms since epoch), or null if the sign-in was not noted. */
export function readSessionExpiry() {
  try {
    const value = Number(localStorage.getItem(KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function clearSessionClock() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // See markSessionStart.
  }
}
