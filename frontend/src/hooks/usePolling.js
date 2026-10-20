import { useEffect, useRef } from "react";

/**
 * Calls `callback` every `intervalMs` while the tab is visible, and once more the moment the
 * tab comes back into view, so a status page is current when someone returns to it without
 * ever reloading. `enabled` switches it off (e.g. once there is nothing left to wait for).
 */
export function usePolling(callback, intervalMs, enabled = true) {
  const latest = useRef(callback);
  latest.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;

    function tick() {
      if (document.visibilityState === "visible") latest.current();
    }

    const timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs, enabled]);
}
