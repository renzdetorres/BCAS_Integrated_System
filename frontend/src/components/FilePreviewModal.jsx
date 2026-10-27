import { useEffect, useState } from "react";
import { ApiError } from "../api/apiClient.js";
import Modal from "./ui/Modal.jsx";
import "./FilePreviewModal.css";

/**
 * Previews one uploaded file (PDF, JPG or PNG) in place. `loadFile` returns
 * the file as a Blob, fetched with the auth cookie so the file never needs a
 * public URL. Pass `details` to show a block of facts above the file and
 * `actions` for extra footer buttons (e.g. Verify / Reject).
 */
export default function FilePreviewModal({ title, subtitle, fileName, loadFile, details, actions, busy = false, onClose }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    loadFile()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setIsImage(blob.type.startsWith("image/"));
        setFileUrl(objectUrl);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load this file.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // loadFile is recreated on every render by callers; the file is loaded once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={title}
      subtitle={subtitle}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Close
          </button>
          {fileUrl ? (
            <a className={actions ? "btn btn-secondary" : "btn btn-primary"} href={fileUrl} download={fileName}>
              Download file
            </a>
          ) : null}
          {actions}
        </>
      }
    >
      {details ? <div className="ui-modal-section">{details}</div> : null}
      <div className="ui-modal-section">
        {isLoading ? (
          <div className="file-preview file-preview-empty">Loading file...</div>
        ) : errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : isImage ? (
          // A photo (the 2x2 picture) is shown whole, fitted to the box. The browser's own viewer inside an
          // iframe can open it at full size and crop the face.
          <div className="file-preview file-preview-image">
            <img src={fileUrl} alt={`${title}, shown in full`} />
          </div>
        ) : (
          <iframe className="file-preview" src={fileUrl} title={`${title} preview`} />
        )}
      </div>
    </Modal>
  );
}
