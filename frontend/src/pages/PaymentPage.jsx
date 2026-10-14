import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyExamPayment, getMyPaymentProofFile, submitPaymentProof } from "../api/examPaymentApi.js";
import { ApiError } from "../api/apiClient.js";
import { fileProblem } from "../config/requiredDocuments.js";
import { formatDateTime, formatFileSize } from "../utils/format.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import FilePreviewModal from "../components/FilePreviewModal.jsx";
import Card from "../components/ui/Card.jsx";
import Notice from "../components/ui/Notice.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./PaymentPage.css";

const PROOF_FORMATS = ["PDF", "JPG", "PNG"];

function peso(amount) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

export default function PaymentPage() {
  const [payment, setPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [needsApplication, setNeedsApplication] = useState(false);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [reference, setReference] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

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
    if (!file) {
      setFileError("Attach a screenshot or photo of your receipt.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      setPayment(await submitPaymentProof(file, reference.trim()));
      setFile(null);
      setReference("");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to upload your proof of payment.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <AppLayout title="Entrance Exam Payment">
      {isLoading && (
        <Card>
          <p>Loading...</p>
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

      {payment && (
        <div className="payment-layout">
          <Card>
            <div className="payment-head">
              <div>
                <h2>Pay the entrance exam fee</h2>
                <p className="payment-sub">{payment.paymentType}</p>
              </div>
              <StatusBadge status={payment.status} label={payment.status === "NotPaid" ? "Not paid yet" : undefined} />
            </div>

            <dl className="payment-facts">
              <div>
                <dt>Amount to pay</dt>
                <dd className="payment-amount">{peso(payment.amount)}</dd>
              </div>
              {payment.accountName ? (
                <div>
                  <dt>Pay to</dt>
                  <dd>{payment.accountName}</dd>
                </div>
              ) : null}
              {payment.invoiceNumber ? (
                <div>
                  <dt>Sales invoice no.</dt>
                  <dd>{payment.invoiceNumber}</dd>
                </div>
              ) : null}
            </dl>

            {payment.instructions ? <p className="payment-instructions">{payment.instructions}</p> : null}

            {payment.qrImage ? (
              <figure className="payment-qr">
                <img src={payment.qrImage} alt="The school's QR payment code" />
                <figcaption>Scan with your banking or e-wallet app</figcaption>
              </figure>
            ) : (
              <p className="payment-qr-missing">The school hasn&apos;t published its QR code yet. Check back soon or contact the admissions office.</p>
            )}
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
                We received your proof on {formatDateTime(payment.proofUploadedAt)}. Staff will verify it and you&apos;ll be notified.
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
                {payment.referenceNumber ? <span> &middot; Ref. {payment.referenceNumber}</span> : null}
                {" "}
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
              <form onSubmit={handleSubmit} className="payment-form" noValidate>
                <div className="form-row">
                  <label htmlFor="reference">Reference number (optional)</label>
                  <input id="reference" type="text" maxLength={60} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="From your payment receipt" />
                </div>

                <div className="form-row">
                  <label htmlFor="proof">Screenshot or photo of your receipt (PDF, JPG or PNG)</label>
                  <input id="proof" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={handleFile} />
                  {file && (
                    <p className="form-note">
                      {file.name} &middot; {formatFileSize(file.size)}
                    </p>
                  )}
                  {fileError && (
                    <p className="form-error" role="alert">
                      {fileError}
                    </p>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" disabled={isUploading}>
                  {isUploading ? "Uploading..." : payment.status === "Rejected" ? "Upload new proof" : payment.status === "Pending" ? "Replace proof" : "Submit proof of payment"}
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
    </AppLayout>
  );
}
