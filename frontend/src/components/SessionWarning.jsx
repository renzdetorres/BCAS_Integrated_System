import { useEffect, useRef, useState } from "react";
import { getSession } from "../api/authApi.js";
import { useLogout } from "../hooks/useLogout.js";
import { useSession } from "../context/SessionContext.jsx";
import { clearSessionClock, readSessionExpiry } from "../utils/sessionClock.js";
import Button from "./ui/Button.jsx";
import Modal from "./ui/Modal.jsx";
import "./SessionWarning.css";

const WARN_MS = 5 * 60_000;
const FINAL_MS = 60_000;
const RECHECK_MS = 30_000;

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * "No surprise logouts". Five minutes before the sign-in ends a dialog says so with a countdown,
 * and it comes back for the last minute if it was put away. A sign-in cannot be extended (the
 * login has a fixed lifetime), so the dialog tells people to finish and save; when the time is up
 * it asks the server before saying the session has ended, so a stale clock never signs anyone out.
 */
export default function SessionWarning() {
  const handleLogout = useLogout();
  const { session } = useSession();
  const [now, setNow] = useState(() => Date.now());
  const [expiry, setExpiry] = useState(readSessionExpiry);
  const [dismissedFor, setDismissedFor] = useState(null); // "warn" once the 5-minute notice is put away
  const [ended, setEnded] = useState(false);
  const checking = useRef(false);
  const nextCheckAt = useRef(0);

  const remaining = expiry === null ? null : expiry - now;
  const inWindow = remaining !== null && remaining <= WARN_MS;

  // One-second ticks while a countdown matters; a slow check otherwise (and to pick up a new sign-in).
  useEffect(() => {
    const interval = setInterval(
      () => {
        setNow(Date.now());
        setExpiry(readSessionExpiry());
      },
      inWindow ? 1000 : 15_000,
    );
    return () => clearInterval(interval);
  }, [inWindow]);

  // Time is up: ask the server whether the session is really over.
  useEffect(() => {
    if (remaining === null || remaining > 0 || ended || checking.current || Date.now() < nextCheckAt.current) return;
    checking.current = true;
    nextCheckAt.current = Date.now() + RECHECK_MS;
    getSession()
      .then((user) => {
        clearSessionClock();
        if (user) {
          // Still signed in, so the noted time was stale and the real end is unknown: stop warning
          // rather than warn at the wrong moment. The API still ends the session on its own.
          setExpiry(null);
        } else {
          setEnded(true);
        }
      })
      .catch(() => {
        // The server could not be reached: say nothing and ask again in a moment.
      })
      .finally(() => {
        checking.current = false;
      });
  }, [remaining, ended]);

  if (ended) {
    return (
      <Modal
        open
        busy
        size="sm"
        title="Your session has ended"
        onClose={() => {}}
        footer={
          <Button type="button" onClick={handleLogout}>
            Log in again
          </Button>
        }
      >
        <p className="session-warning-text">
          For your security you were signed out after a period of time. Anything saved is still there; log in again to
          pick up where you left off.
        </p>
      </Modal>
    );
  }

  const isFinalMinute = remaining !== null && remaining <= FINAL_MS;
  const open = inWindow && remaining > 0 && (dismissedFor !== "warn" || isFinalMinute);

  return (
    <Modal
      open={open}
      size="sm"
      title="Your session is about to end"
      onClose={() => setDismissedFor("warn")}
      footer={
        <Button type="button" onClick={() => setDismissedFor("warn")} data-autofocus>
          Keep working
        </Button>
      }
    >
      <div className="session-warning-clock" role="timer" aria-live="off">
        <span className="session-warning-time">{formatRemaining(remaining ?? 0)}</span>
        <span className="session-warning-unit">until you are signed out</span>
      </div>
      <p className="session-warning-text">
        Finish what you are doing and save it.
        {session?.role === "Applicant" ? " Your admission draft saves itself as you type." : ""} After that, log in again to
        keep going.
      </p>
    </Modal>
  );
}
