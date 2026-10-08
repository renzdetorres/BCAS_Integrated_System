import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import StatusBadge from "./StatusBadge.jsx";
import "./StatusLegend.css";

/**
 * A small "?" button that explains the statuses. Opens on hover or focus
 * and toggles on click/tap; Escape or a click elsewhere closes it.
 * groups: [{ title?, statuses: [{ value, description }] }]
 */
export default function StatusLegend({ groups, adminContext = false }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimer = useRef(null);
  const panelId = useId();

  // The panel is portalled to <body> and positioned from the button, so a
  // table's scroll container can never clip it.
  function show() {
    clearTimeout(closeTimer.current);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(340, window.innerWidth - 24);
      setPosition({ top: rect.bottom + 6, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width });
    }
    setOpen(true);
  }

  // A short delay lets the pointer travel from the button onto the panel.
  function hideSoon() {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    const onPointerDown = (event) => {
      if (!buttonRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  return (
    <span className="status-legend" onMouseEnter={show} onMouseLeave={hideSoon}>
      <button
        type="button"
        ref={buttonRef}
        className="status-legend-button"
        aria-label="What the statuses mean"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? setOpen(false) : show())}
      >
        <Icon name="help" size={14} />
      </button>
      {open && position
        ? createPortal(
            <div
              id={panelId}
              ref={panelRef}
              className="status-legend-panel"
              role="region"
              aria-label="Status guide"
              style={{ top: position.top, left: position.left, width: position.width }}
              onMouseEnter={() => clearTimeout(closeTimer.current)}
              onMouseLeave={hideSoon}
            >
              {groups.map((group) => (
                <div key={group.title ?? "statuses"} className="status-legend-group">
                  {group.title ? <p className="status-legend-title">{group.title}</p> : null}
                  <ul>
                    {group.statuses.map((status) => (
                      <li key={status.value}>
                        <StatusBadge status={status.value} adminContext={adminContext} />
                        <span>{status.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
