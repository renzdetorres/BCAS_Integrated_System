import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/ui/Icon.jsx";
import SuccessMoment from "../components/ui/SuccessMoment.jsx";
import "../components/ui/Toast.css";

const ToastContext = createContext(undefined);

const MAX_VISIBLE = 4;
const LEAVE_MS = 180;
const AUTO_DISMISS_MS = { success: 4500, info: 5000, warning: 6500, error: 7500 };

// Used when a call gives only a message: every toast reads as a short title and a plain sentence.
const DEFAULT_TITLES = {
  success: "Done",
  info: "For your information",
  warning: "Heads up",
  error: "Something went wrong",
};

const TONE_ICONS = { success: "check", info: "info", warning: "alert", error: "alert" };

function Toast({ toast, onDismiss }) {
  const timer = useRef(null);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);

  const arm = useCallback(() => {
    clearTimeout(timer.current);
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDismiss(toast.id), remaining.current);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    arm();
    return () => clearTimeout(timer.current);
  }, [arm]);

  // Reading takes time: the countdown holds while the pointer or keyboard focus is on the toast.
  function pause() {
    clearTimeout(timer.current);
    remaining.current = Math.max(1200, remaining.current - (Date.now() - startedAt.current));
  }

  const isUrgent = toast.tone === "error" || toast.tone === "warning";

  return (
    <div
      className={`toast toast-${toast.tone}${toast.leaving ? " is-leaving" : ""}`}
      role={isUrgent ? "alert" : "status"}
      onMouseEnter={pause}
      onMouseLeave={arm}
      onFocus={pause}
      onBlur={arm}
    >
      <span className="toast-icon" aria-hidden="true">
        <Icon name={TONE_ICONS[toast.tone]} size={16} />
      </span>
      <div className="toast-text">
        <p className="toast-title">{toast.title}</p>
        {toast.message ? <p className="toast-message">{toast.message}</p> : null}
      </div>
      <button type="button" className="toast-dismiss" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [moment, setMoment] = useState(null);
  const nextId = useRef(0);

  // Leaves with a short fade, then is removed.
  const dismiss = useCallback((id) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), LEAVE_MS);
  }, []);

  /**
   * showToast("Saved.")                                        a success
   * showToast("Could not save.", "error")                      tones: success | info | warning | error
   * showToast("Only 9% remain.", "warning", { title: "Slots almost full" })
   */
  const showToast = useCallback((message, tone = "success", options = {}) => {
    const resolvedTone = DEFAULT_TITLES[tone] ? tone : "success";
    const id = nextId.current++;
    const toast = {
      id,
      tone: resolvedTone,
      title: options.title ?? DEFAULT_TITLES[resolvedTone],
      message,
      duration: options.duration ?? AUTO_DISMISS_MS[resolvedTone],
    };
    setToasts((current) => [...current, toast].slice(-MAX_VISIBLE));
  }, []);

  /** A short celebration for an approval: showSuccessMoment({ title: "Application approved", detail: "Reference BCAS-2026-0139" }) */
  const showSuccessMoment = useCallback((details) => setMoment({ ...details, key: Date.now() }), []);

  const value = useMemo(() => ({ showToast, showSuccessMoment }), [showToast, showSuccessMoment]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
      {moment ? <SuccessMoment key={moment.key} title={moment.title} detail={moment.detail} onDone={() => setMoment(null)} /> : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
