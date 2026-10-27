import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyExamPayment, getMyPaymentProofFile, submitPaymentProof } from "../api/examPaymentApi.js";
import { ApiError } from "../api/apiClient.js";
import { fileProblem } from "../config/requiredDocuments.js";
import { formatDateTime, formatFileSize } from "../utils/format.js";
import { useToast } from "../context/ToastContext.jsx";
import { usePolling } from "../hooks/usePolling.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import FilePreviewModal from "../components/FilePreviewModal.jsx";
import WorkflowStepper from "../components/WorkflowStepper.jsx";
import Card from "../components/ui/Card.jsx";
import Modal from "../components/ui/Modal.jsx";
import Notice from "../components/ui/Notice.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import UploadProgress from "../components/ui/UploadProgress.jsx";
import "./PaymentPage.css";

const PROOF_FORMATS = ["PDF", "JPG", "PNG"];

// The road from "you owe the fee" to "you can sit the exam", drawn with the same tracker the
// application uses so the two read as one system.
const PAYMENT_STEPS = ["Required", "Pay", "Upload", "Verifying", "Confirmed", "Permit"];
const PAYMENT_STEP_LABELS = {
  Required: "Payment required",
  Pay: "Scan QR and pay",
  Upload: "Upload proof",
  Verifying: "Under verification",
  Confirmed: "Payment confirmed",
  Permit: "Exam permit available",
};
const PAYMENT_STEP_HINTS = {
  Pay: "Pay with the method you chose, using the details shown.",
  Upload: "Attach a clear photo or screenshot of your receipt.",
  Verifying: "Staff are checking your receipt. You'll be notified.",
  Permit: "Choose your exam schedule to get your permit.",
};

// How often a payment that is waiting on staff is re-checked while this page is open.
const REFRESH_MS = 30000;

function peso(amount) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

/** Which of the six stages the applicant is on right now. */
function currentStage(payment, hasFile) {
  if (payment.status === "Verified") return 5;
  if (payment.status === "Pending") return 3;
  if (payment.status === "Rejected") return 2;
  return hasFile ? 2 : 1;
}

export default function PaymentPage() {
  const { showToast } = useToast();
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

  function handleFile(event) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const problem = fileProblem(chosen, PROOF_FORMATS);
    setFileError(problem);
    setFile(problem ? null : chosen);
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

  const stage = payment ? currentStage(payment, Boolean(file)) : 0;
  const steps = PAYMENT_STEPS.map((key, index) => ({ step: key, isComplete: index < stage, isCurrent: index === stage }));

  return (
    <AppLayout title="Entrance Exam Payment">
      {isLoading && (
        <Card>
          <Skeleton />
        </Card>
      )}

      {!isLoading && needsApplication && (
        <Card>
          <p className="form-error" role="alert">
            Submit an admission application first. <Link to="/applications">Apply now</Link>.
          </p>
        </Card>
      )}

      {!isLoading && errorMessage && !payment && (
        <Card>
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        </Card>
      )}

      {payment && payment.required && (
        <Card className="payment-steps">
          <WorkflowStepper steps={steps} labels={PAYMENT_STEP_LABELS} hints={PAYMENT_STEP_HINTS} numbered />
        </Card>
      )}

      {payment && (
        <div className="payment-layout">
          <Card>
            <div className="payment-head">
              <div>
                <h2>Pay the entrance exam fee</h2>
                <p className="payment-sub">{selected?.name ?? payment.paymentType}</p>
              </div>
              <StatusBadge status={payment.status} label={payment.status === "NotPaid" ? "Not paid yet" : undefined} />
            </div>

            {methods.length > 1 ? (
              <fieldset className="payment-methods" disabled={payment.status === "Verified"}>
                <legend>Pay with</legend>
                <div className="payment-method-grid">
                  {methods.map((method) => (
                    <label key={method.name} className={`payment-method${selected?.name === method.name ? " is-chosen" : ""}`}>
                      <input type="radio" name="payment-method" value={method.name} checked={selected?.name === method.name} onChange={() => setChosenMethod(method.name)} />
                      <span>{method.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <dl className="payment-facts" key={selected?.name}>
              <div>
                <dt>Amount to pay</dt>
                <dd className="payment-amount">{peso(payment.amount)}</dd>
              </div>
              {selected?.accountName ? (
                <div>
                  <dt>Pay to</dt>
                  <dd>{selected.accountName}</dd>
                </div>
              ) : null}
              {selected?.accountNumber ? (
                <div>
                  <dt>{selected.name} number</dt>
                  <dd className="payment-number">
                    <span>{selected.accountNumber}</span>
                    <button type="button" className="documents-view-link" onClick={() => copyNumber(selected.accountNumber)}>
                      Copy
                    </button>
                  </dd>
                </div>
              ) : null}
              {payment.invoiceNumber ? (
                <div>
                  <dt>Sales invoice no.</dt>
                  <dd>{payment.invoiceNumber}</dd>
                </div>
              ) : null}
            </dl>

            {selected?.instructions ? <p className="payment-instructions">{selected.instructions}</p> : null}

            {selected?.qrImage ? (
              <figure className="payment-qr" key={selected.name}>
                <img src={selected.qrImage} alt={`The school's QR payment code for ${selected.name}`} width="220" height="220" />
                <figcaption>Scan with your banking or e-wallet app</figcaption>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQrOpen(true)}>
                  View larger
                </button>
              </figure>
            ) : !selected?.accountNumber && !selected?.instructions ? (
              <p className="payment-qr-missing">The school hasn&apos;t published its payment details yet. Check back soon or contact the admissions office.</p>
            ) : null}
          </Card>

          <Card>
            <h2>Proof of payment</h2>

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
                {selected ? (
                  <p className="payment-with" role="status">
                    You are paying with <strong>{selected.name}</strong>.
                  </p>
                ) : null}
                <div className="form-row">
                  <label htmlFor="reference">
                    Reference number
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
                    placeholder="From your payment receipt"
                    disabled={isUploading}
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="proof">
                    Screenshot or photo of your receipt (PDF, JPG or PNG)
                    <span className="required-mark" title="Required" aria-label="required">
                      {" "}
                      *
                    </span>
                  </label>
                  <input
                    id="proof"
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

                <button type="submit" className="btn btn-primary" disabled={isUploading}>
                  {isUploading
                    ? `Uploading... ${percent}%`
                    : payment.status === "Rejected"
                      ? "Upload new proof"
                      : payment.status === "Pending"
                        ? "Replace proof"
                        : "Submit proof of payment"}
                </button>
              </form>
            )}
          </Card>
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
