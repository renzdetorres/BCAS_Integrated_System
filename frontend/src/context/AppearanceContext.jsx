import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_APPEARANCE,
  applyAppearance,
  loadAppearance,
  saveAppearance,
} from "../utils/appearance.js";

const AppearanceContext = createContext(undefined);

/**
 * The person's Appearance and Layout choices. They belong to this browser, not to the account,
 * so they apply on the sign-in screen too and need no request to the server.
 */
export function AppearanceProvider({ children }) {
  const [appearance, setAppearanceState] = useState(loadAppearance);

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  // "System" follows the device: switching the device to dark at sunset switches the app too.
  useEffect(() => {
    if (appearance.scheme !== "system" || typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyAppearance(appearance);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [appearance]);

  // Resizing the window can change how much layout scale fits.
  useEffect(() => {
    let frame = 0;
    function handleResize() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => applyAppearance(appearance));
    }
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [appearance]);

  // Another tab changed a choice: follow it.
  useEffect(() => {
    function handleStorage(event) {
      if (event.key === null || event.key === "bcas.appearance") setAppearanceState(loadAppearance());
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setAppearance = useCallback((changes) => {
    setAppearanceState((current) => {
      const next = { ...current, ...changes };
      saveAppearance(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveAppearance(DEFAULT_APPEARANCE);
    setAppearanceState({ ...DEFAULT_APPEARANCE });
  }, []);

  const value = useMemo(() => ({ appearance, setAppearance, reset }), [appearance, setAppearance, reset]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}
