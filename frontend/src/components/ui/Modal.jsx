import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import "./Modal.css";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The system's one dialog: record details and short create/edit forms that
 * belong to a list, so the list stays where it was underneath.
 *
 * Escape and the backdrop close it (unless `busy`), focus moves into it and
 * returns to whatever opened it, Tab stays inside, and the page behind it
 * doesn't scroll. `footer` holds the actions, right-aligned.
 */
export default function Modal({ open, onClose, title, subtitle, size = "md", busy = false, footer, children }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const first = dialog?.querySelector("[data-autofocus]") ?? dialog?.querySelector(FOCUSABLE);
    (first ?? dialog)?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape" && !busyRef.current) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
    // Only `open` re-runs this: re-running it on every parent render would
    // steal focus back to the first field. onClose is read through a ref.
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="ui-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div
        ref={dialogRef}
        className={`ui-modal ui-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="ui-modal-header">
          <div className="ui-modal-heading">
            <h2 id={titleId} className="ui-modal-title">
              {title}
            </h2>
            {subtitle ? <p className="ui-modal-subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="ui-modal-close" onClick={onClose} disabled={busy} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="ui-modal-body">{children}</div>
        {footer ? <footer className="ui-modal-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Label/value pairs for record details inside a modal. */
export function DetailList({ items }) {
  return (
    <dl className="ui-detail-list">
      {items
        .filter((item) => item && item.value !== undefined)
        .map((item) => (
          <div key={item.label} className={item.wide ? "ui-detail-wide" : undefined}>
            <dt>{item.label}</dt>
            <dd>{item.value === null || item.value === "" ? <span className="ui-detail-empty">Not provided</span> : item.value}</dd>
          </div>
        ))}
    </dl>
  );
}
