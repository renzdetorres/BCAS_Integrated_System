import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { PAGE_LOADED_EVENT, PAGE_LOADING_EVENT } from "../utils/lazyPage.js";
import "./RouteProgress.css";

const SWEEP_MS = 420;
const TRICKLE_MS = 180;
const HOLD_AT = 90;

/**
 * A slim gold line along the top edge that runs on every route change. On a first visit to a page
 * it follows the page's file being fetched and finishes when it arrives; on every other visit it
 * is a short sweep, so a click always gets an answer. The full splash covers its own line, so
 * this stays quiet while the splash is up.
 */
export default function RouteProgress() {
  const { pathname } = useLocation();
  const [bar, setBar] = useState({ running: false, progress: 0, run: 0 });
  const pendingPages = useRef(0);
  const trickleTimer = useRef(null);
  const finishTimer = useRef(null);
  const hideTimer = useRef(null);
  const firstRender = useRef(true);
  const phase = useRef("idle"); // idle | running | finishing

  function clearTimers() {
    clearInterval(trickleTimer.current);
    clearTimeout(finishTimer.current);
    clearTimeout(hideTimer.current);
  }

  function start() {
    if (document.querySelector(".splash")) return;
    // Already running (a page file and the route change both ask): keep the one line going.
    if (phase.current === "running") return;
    clearTimers();
    phase.current = "running";
    setBar((current) => ({ running: true, progress: 0.14, run: current.run + 1 }));
    trickleTimer.current = setInterval(() => {
      setBar((current) => ({
        ...current,
        progress: current.progress + (HOLD_AT / 100 - current.progress) * 0.14,
      }));
    }, TRICKLE_MS);
  }

  function finish() {
    if (phase.current !== "running") return;
    phase.current = "finishing";
    clearInterval(trickleTimer.current);
    setBar((current) => (current.running ? { ...current, progress: 1 } : current));
    // Fades out where it finished; the next run mounts a fresh line, so it never slides back.
    hideTimer.current = setTimeout(() => {
      phase.current = "idle";
      setBar((current) => ({ ...current, running: false }));
    }, 260);
  }

  useEffect(() => {
    function handleLoading() {
      pendingPages.current += 1;
      start();
    }
    function handleLoaded() {
      pendingPages.current = Math.max(0, pendingPages.current - 1);
      if (pendingPages.current === 0) finish();
    }
    window.addEventListener(PAGE_LOADING_EVENT, handleLoading);
    window.addEventListener(PAGE_LOADED_EVENT, handleLoaded);
    return () => {
      window.removeEventListener(PAGE_LOADING_EVENT, handleLoading);
      window.removeEventListener(PAGE_LOADED_EVENT, handleLoaded);
      clearTimers();
    };
    // start and finish only touch refs and the setter, so the listeners are attached once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A route change: the sweep. If a page file is still on its way, its own event finishes the line.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return undefined;
    }
    start();
    finishTimer.current = setTimeout(() => {
      if (pendingPages.current === 0) finish();
    }, SWEEP_MS);
    return () => clearTimeout(finishTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className={bar.running ? "route-progress is-running" : "route-progress"} aria-hidden="true">
      <span key={bar.run} className="route-progress-fill" style={{ transform: `scaleX(${bar.progress})` }} />
    </div>
  );
}
