import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyExamPayment, getMyPaymentProofFile, submitPaymentProof } from "../api/examPaymentApi.js";
import { ApiError } from "../api/apiClient.js";
import { fileProblem } from "../config/requiredDocuments.js";
import { formatDateTime, formatFileSize } from "../utils/format.js";
import { useToast } from "../context/ToastContext.jsx";
import { usePolling } from "../hooks/usePolling.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import FilePreviewModal from "../components/FilePreviewModal.jsx";
import Icon from "../components/ui/Icon.jsx";
import Modal from "../components/ui/Modal.jsx";
import Notice from "../components/ui/Notice.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import UploadProgress from "../components/ui/UploadProgress.jsx";
import "./PaymentPage.css";

const PROOF_FORMATS = ["PDF", "JPG", "PNG"];

// The three things an applicant does here: pick how to pay, send the proof, then wait for staff to confirm it.
const PROGRESS_STEPS = ["Select Method", "Submit Proof", "Confirmation"];

// How often a payment that is waiting on staff is re-checked while this page is open.
const REFRESH_MS = 30000;

function peso(amount) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

/** Which of the three steps the applicant is on right now (3 = all done). */
function currentStep(payment, hasFile) {
  if (payment.status === "Verified") return 3;
  if (payment.status === "Pending") return 2;
  if (payment.status === "Rejected") return 1;
  return hasFile ? 1 : 0;
}

/** The kind of method a configured name is, so each one gets a fitting icon and a plain description. */
function methodKind(name) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("gcash")) return "gcash";
  if (n.includes("maya")) return "maya";
  if (/(bank|transfer|bdo|bpi|unionbank|landbank|metrobank)/.test(n)) return "bank";
  if (/(counter|office|cash|walk|onsite|on-site)/.test(n)) return "counter";
  return "wallet";
}

function methodHint(name) {
  const kind = methodKind(name);
  if (kind === "bank") return "Online banking";
  if (kind === "counter") return "Pay at the BCAS office";
  return `Pay using ${name}`;
}

const STROKE_ICONS = {
  bank: "M3 10 12 4l9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18M3 10h18",
  counter: "M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9c0 1.7 1.3 3 2.7 3S9.3 10.7 9.3 9c0 1.7 1.3 3 2.7 3s2.7-1.3 2.7-3c0 1.7 1.3 3 2.7 3S20 10.7 20 9M9 20v-5h6v5",
  wallet: "M4 7a2 2 0 0 1 2-2h12v4M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2Zm12 6h4v3h-4a1.5 1.5 0 0 1 0-3Z",
};

function MethodIcon({ kind }) {
  if (kind === "gcash") {
    return (
      <span className="payment-method-mark payment-method-mark-gcash" aria-hidden="true">
        G
      </span>
    );
  }
  if (kind === "maya") {
    return (
      <span className="payment-method-mark payment-method-mark-maya" aria-hidden="true">
        maya
      </span>
    );
  }
  return (
    <svg className="payment-method-glyph" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={STROKE_ICONS[kind] ?? STROKE_ICONS.wallet} />
    </svg>
  );
}

function PaymentProgress({ step }) {
  return (
    <ol className="payment-progress" aria-label="Payment progress">
      {PROGRESS_STEPS.map((label, index) => {
        const state = index < step ? "done" : index === step ? "current" : "next";
        return (
          <li key={label} className={`payment-progress-step payment-progress-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="payment-progress-dot" aria-hidden="true">
              {state === "done" ? <Icon name="check" size={13} /> : index + 1}
            </span>
            <span className="payment-progress-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function PaymentPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [needsApplication, setNeedsApplication] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [reference, setReference] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [previewingChosen, setPreviewingChosen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [chosenMethod, setChosenMethod] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyExamPayment()
      .then((data) => {
        if (!cancelled) setPayment(data);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 400) setNeedsApplication(true);
        else setErrorMessage(error instanceof ApiError ? error.message : "Failed to load your payment.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A thumbnail of the chosen receipt, so the applicant can see it is the right one before sending.
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setImageUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // While staff are verifying, the page checks for the answer itself: the status, the stepper and a
  // toast change in place, with no reload.
  const checkStatus = useCallback(() => {
    getMyExamPayment()
      .then((next) => {
        setPayment((current) => {
          if (!current || current.status === next.status) return current;
          if (next.status === "Verified") showToast("Your payment was confirmed. You can now choose your exam schedule.");
          if (next.status === "Rejected") showToast("Your proof of payment was rejected. See the reason below.", "error");
          return next;
        });
      })
      .catch(() => {
        // A failed background check changes nothing; the next one tries again.
      });
  }, [showToast]);

  usePolling(checkStatus, REFRESH_MS, payment?.status === "Pending");

  function acceptFile(chosen) {
    if (!chosen) return;
    const problem = fileProblem(chosen, PROOF_FORMATS);
    setFileError(problem);
    setFile(problem ? null : chosen);
  }

  function handleFile(event) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    acceptFile(chosen);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    acceptFile(event.dataTransfer?.files?.[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isUploading) return;
    if (reference.trim().length === 0) {
      setErrorMessage("Enter the reference number from your payment receipt.");
      return;
    }
    if (!file) {
      setFileError("Attach a screenshot or photo of your receipt.");
      return;
    }

    setIsUploading(true);
    setPercent(0);
    setErrorMessage(null);
    try {
      setPayment(await submitPaymentProof(file, reference.trim(), setPercent, selected?.name));
      setFile(null);
      setReference("");
      showToast("Payment proof submitted for verification.");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to upload your proof of payment.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setIsUploading(false);
    }
  }

  // The method whose details are on screen: the one the applicant picked, else the one they paid with, else the first.
  const methods = payment?.methods ?? [];
  const selected = methods.find((method) => method.name === chosenMethod) ?? methods.find((method) => method.name === payment?.paymentType) ?? methods[0] ?? null;

  async function copyNumber(number) {
    try {
      await navigator.clipboard.writeText(number);
      showToast("Account number copied.");
    } catch {
      showToast("Couldn't copy it. Select the number and copy it by hand.", "error");
    }
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/portal");
  }

  const step = payment ? currentStep(payment, Boolean(file)) : 0;

  return (
    <AppLayout>
      {isLoading && (
        <section className="payment-panel">
          <Skeleton />
        </section>
      )}

      {!isLoading && needsApplication && (
        <section className="payment-panel">
          <p className="form-error" role="alert">
            Submit an admission application first. <Link to="/applications">Apply now</Link>.
          </p>
        </section>
      )}

      {!isLoading && errorMessage && !payment && (
        <section className="payment-panel">
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        </section>
      )}

      {payment && (
        <div className="payment-layout">
          <section className="payment-panel payment-pay" aria-labelledby="payment-title">
            <button type="button" className="payment-back" onClick={goBack}>
              <Icon name="arrow-left" size={16} />
              Back
            </button>
            <h1 id="payment-title" className="payment-title">
              Pay Entrance Exam Fee
            </h1>
            <p className="payment-lead">Complete your payment to proceed with your application.</p>

            <div className="payment-summary">
              <span className="payment-summary-icon" aria-hidden="true">
                <Icon name="doc" size={26} />
              </span>
              <div className="payment-summary-block">
                <span className="payment-summary-label">Entrance Exam Fee</span>
                <span className="payment-summary-amount">{peso(payment.amount)}</span>
              </div>
              <div className="payment-summary-block payment-summary-app">
                <span className="payment-summary-label">Application</span>
                <span className="payment-summary-value">Admission Application</span>
              </div>
              {/* "Not paid yet" is a waiting state, so it wears the amber pill. */}
              <StatusBadge status={payment.status === "NotPaid" ? "Pending" : payment.status} label={payment.status === "NotPaid" ? "Not Paid Yet" : undefined} />
            </div>

            {payment.required ? <PaymentProgress step={step} /> : null}

            {methods.length > 0 ? (
              <fieldset className="payment-methods" disabled={payment.status === "Verified"}>
                <legend className="payment-section-head">
                  <span className="payment-section-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={STROKE_ICONS.wallet} />
                    </svg>
                  </span>
                  <span>
                    <span className="payment-section-title">Choose Payment Method</span>
                    <span className="payment-section-sub">Select your preferred payment method below.</span>
                  </span>
                </legend>
                <div className="payment-method-grid">
                  {methods.map((method) => {
                    const chosen = selected?.name === method.name;
                    return (
                      <label key={method.name} className={`payment-method${chosen ? " is-chosen" : ""}`}>
                        <input type="radio" name="payment-method" value={method.name} checked={chosen} onChange={() => setChosenMethod(method.name)} />
                        <MethodIcon kind={methodKind(method.name)} />
                        <span className="payment-method-text">
                          <span className="payment-method-name">{method.name}</span>
                          <span className="payment-method-hint">{methodHint(method.name)}</span>
                        </span>
                        {chosen ? (
                          <span className="payment-method-check" aria-hidden="true">
                            <Icon name="check" size={13} />
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {selected ? (
              <section className="payment-instructions-card" key={`facts-${selected.name}`} aria-label={`Payment instructions for ${selected.name}`}>
                <div className="payment-instructions-main">
                  <h2 className="payment-instructions-title">
                    <Icon name="info" size={20} />
                    Payment Instructions ({selected.name})
                  </h2>
                  <dl className="payment-facts">
                    <div>
                      <dt>Amount to Pay:</dt>
                      <dd className="payment-amount">{peso(payment.amount)}</dd>
                    </div>
                    {selected.accountName ? (
                      <div>
                        <dt>Send Payment to:</dt>
                        <dd>{selected.accountName}</dd>
                      </div>
                    ) : null}
                    {selected.accountNumber ? (
                      <div>
                        <dt>{selected.name} Number:</dt>
                        <dd className="payment-number">
                          <span>{selected.accountNumber}</span>
                          <button type="button" className="payment-copy" onClick={() => copyNumber(selected.accountNumber)}>
                            <Icon name="copy" size={14} />
                            Copy
                          </button>
                        </dd>
                      </div>
                    ) : null}
                    {payment.invoiceNumber ? (
                      <div>
                        <dt>Sales invoice no.:</dt>
                        <dd>{payment.invoiceNumber}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {selected.instructions ? <p className="payment-instructions">{selected.instructions}</p> : null}
                  {selected.qrImage ? (
                    <p className="payment-scan-note">
                      <Icon name="info" size={15} />
                      Scan the QR code using your {selected.name} or banking app.
                    </p>
                  ) : null}
                  {!selected.qrImage && !selected.accountNumber && !selected.instructions ? (
                    <p className="payment-qr-missing">The school hasn&apos;t published its payment details yet. Check back soon or contact the admissions office.</p>
                  ) : null}
                </div>

                {selected.qrImage ? (
                  <figure className="payment-qr" key={`qr-${selected.name}`}>
                    <button type="button" className="payment-qr-button" onClick={() => setQrOpen(true)} aria-label="View the QR code larger">
                      <img src={selected.qrImage} alt={`The school's QR payment code for ${selected.name}`} width="160" height="160" />
                    </button>
                    <figcaption>Tap to enlarge</figcaption>
                  </figure>
                ) : null}
              </section>
            ) : null}
          </section>

          <section className="payment-panel payment-proof" aria-labelledby="payment-proof-title">
            <div className="payment-proof-head">
              <span className="payment-proof-icon" aria-hidden="true">
                <Icon name="upload" size={24} />
              </span>
              <div>
                <h2 id="payment-proof-title" className="payment-proof-title">
                  Proof of Payment
                </h2>
                <p className="payment-proof-sub">After making the payment, provide the required details below.</p>
              </div>
            </div>

            {payment.status === "Verified" && (
              <>
                <Notice tone="success" title="Payment verified">
                  Verified {payment.verifiedAt ? formatDateTime(payment.verifiedAt) : ""}. You can now choose your exam schedule.
                </Notice>
                <p className="payment-next">
                  <Link className="btn btn-primary" to="/exam-schedule">
                    Choose exam schedule
                  </Link>
                </p>
              </>
            )}

            {payment.status === "Pending" && (
              <Notice tone="info" title="Waiting for verification">
                We received your proof on {formatDateTime(payment.proofUploadedAt)}. Staff will verify it and you&apos;ll be notified. This
                page updates by itself when they do.
              </Notice>
            )}

            {payment.status === "Rejected" && (
              <Notice tone="danger" title="Your proof of payment was rejected">
                {payment.rejectionReason || "Upload a new, clear proof of payment."}
              </Notice>
            )}

            {!payment.required && <Notice tone="info">{payment.notice}</Notice>}

            {payment.required && !payment.canPay && payment.status === "NotPaid" && payment.notice && (
              <Notice tone="warning" title="Not yet">
                {payment.notice}
              </Notice>
            )}

            {payment.proofFileName && (
              <p className="payment-uploaded">
                {payment.proofFileName}
                <span> &middot; Paid with {payment.paymentType}</span>
                {payment.referenceNumber ? <span> &middot; Ref. {payment.referenceNumber}</span> : null}{" "}
                <button type="button" className="documents-view-link" onClick={() => setPreviewing(true)}>
                  View
                </button>
              </p>
            )}

            {errorMessage && (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            )}

            {payment.canPay && (
              <form onSubmit={handleSubmit} className="payment-form" noValidate aria-busy={isUploading}>
                <div className="form-row">
                  <label htmlFor="reference">
                    Reference Number
                    <span className="required-mark" title="Required" aria-label="required">
                      {" "}
                      *
                    </span>
                  </label>
                  <input
                    id="reference"
                    type="text"
                    required
                    maxLength={60}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. 1234567890"
                    disabled={isUploading}
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="proof">
                    Upload Receipt
                    <span className="required-mark" title="Required" aria-label="required">
                      {" "}
                      *
                    </span>
                  </label>
                  <label
                    htmlFor="proof"
                    className={`payment-drop${isDragging ? " is-dragging" : ""}${fileError ? " has-error" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!isUploading) setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 8.5a4.5 4.5 0 0 1 .5 9M12 21v-8m-3.5 3.5L12 13l3.5 3.5" />
                    </svg>
                    <span className="payment-drop-title">Click to upload or drag and drop</span>
                    <span className="payment-drop-hint">PNG, JPG or PDF (Max 10 MB)</span>
                  </label>
                  <input
                    id="proof"
                    className="visually-hidden"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleFile}
                    disabled={isUploading}
                    aria-invalid={fileError ? "true" : undefined}
                    aria-describedby={fileError ? "proof-error" : undefined}
                  />
                  {file && (
                    <div className="payment-chosen">
                      {imageUrl ? (
                        <img className="payment-chosen-thumb" src={imageUrl} alt="" width="64" height="64" />
                      ) : (
                        <span className="payment-chosen-thumb payment-chosen-pdf" aria-hidden="true">
                          PDF
                        </span>
                      )}
                      <p className="payment-chosen-meta">
                        <strong>{file.name}</strong>
                        <span>{formatFileSize(file.size)}</span>
                      </p>
                      <div className="payment-chosen-actions">
                        <button type="button" className="documents-view-link" onClick={() => setPreviewingChosen(true)}>
                          Preview
                        </button>
                        <button type="button" className="documents-view-link" onClick={() => setFile(null)} disabled={isUploading}>
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                  {fileError && (
                    <p className="form-error" id="proof-error" role="alert">
                      {fileError}
                    </p>
                  )}
                </div>

                {isUploading && <UploadProgress percent={percent} label="Uploading your proof of payment" />}

                <button type="submit" className="btn btn-primary payment-submit" disabled={isUploading} aria-busy={isUploading}>
                  <Icon name="send" size={18} />
                  {isUploading
                    ? `Uploading... ${percent}%`
                    : payment.status === "Rejected"
                      ? "Upload New Proof"
                      : payment.status === "Pending"
                        ? "Replace Proof"
                        : "Submit Proof of Payment"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      {previewing && payment && (
        <FilePreviewModal
          title="Proof of payment"
          fileName={payment.proofFileName}
          loadFile={getMyPaymentProofFile}
          onClose={() => setPreviewing(false)}
        />
      )}

      {previewingChosen && file && (
        <FilePreviewModal
          title="Your receipt"
          subtitle="Check that it is clear and shows the amount."
          fileName={file.name}
          loadFile={() => Promise.resolve(file)}
          onClose={() => setPreviewingChosen(false)}
        />
      )}

      {qrOpen && selected?.qrImage && (
        <Modal
          open
          onClose={() => setQrOpen(false)}
          title={`${selected.name} QR code`}
          subtitle={selected.accountName ? `Pay to ${selected.accountName}` : undefined}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setQrOpen(false)}>
                Close
              </button>
              <a className="btn btn-primary" href={selected.qrImage} download={`bcas-${selected.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-qr.png`}>
                Download QR
              </a>
            </>
          }
        >
          <img className="payment-qr-large" src={selected.qrImage} alt={`The school's QR payment code for ${selected.name}, enlarged`} />
        </Modal>
      )}
    </AppLayout>
  );
}
