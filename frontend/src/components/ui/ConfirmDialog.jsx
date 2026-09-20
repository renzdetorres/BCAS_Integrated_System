import { useEffect } from "react";
import "./ConfirmDialog.css";

/**
 * Blocking confirmation for actions that change what applicants/staff can
 * see (deactivating an account, hiding a scholarship or exam schedule) -
 * names the exact record and the exact action so no one confirms blind.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isSubmitting = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSubmitting) onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isSubmitting, onCancel]);

  if (!open) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={() => !isSubmitting && onCancel()}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-cancel" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-dialog-confirm" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
