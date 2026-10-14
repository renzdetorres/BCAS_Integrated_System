import { useCallback, useEffect, useState } from "react";
import {
  PAYMENT_STATUSES,
  getPaymentProofFile,
  listExamPayments,
  rejectExamPayment,
  setPaymentInvoice,
  verifyExamPayment,
} from "../api/examPaymentApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import { formatDateTime } from "../utils/format.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import FilePreviewModal from "../components/FilePreviewModal.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import { DetailList } from "../components/ui/Modal.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./StaffPaymentsPage.css";

function peso(amount) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

/** One payment's proof, its details, and the verify / reject controls while it is still Pending. */
function PaymentReview({ payment, onClose, onChanged }) {
  const { showToast } = useToast();
  const [invoice, setInvoice] = useState(payment.invoiceNumber ?? "");
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const reviewable = payment.status === "Pending";

  async function run(action, success) {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await action();
      showToast(success);
      await onChanged();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleVerify() {
    return run(() => verifyExamPayment(payment.paymentId, invoice.trim()), "Payment verified.");
  }

  function handleSaveInvoice() {
    if (!invoice.trim()) {
      setErrorMessage("Enter the sales invoice (SI) number.");
      return Promise.resolve();
    }
    return run(() => setPaymentInvoice(payment.paymentId, invoice.trim()), "Sales invoice number saved.");
  }

  function handleReject() {
    if (!reason.trim()) {
      setErrorMessage("Give the applicant a reason for rejecting this payment.");
      return Promise.resolve();
    }
    return run(() => rejectExamPayment(payment.paymentId, reason.trim()), "Payment rejected.");
  }

  const details = (
    <>
      <DetailList
        items={[
          { label: "Status", value: <StatusBadge status={payment.status} /> },
          { label: "Amount", value: peso(payment.amount) },
          { label: "Payment type", value: payment.paymentType },
          { label: "Reference no.", value: payment.referenceNumber },
          { label: "Proof uploaded", value: formatDateTime(payment.proofUploadedAt) },
          { label: "Course", value: payment.courseAppliedFor },
          payment.invoiceNumber ? { label: "Sales invoice no.", value: payment.invoiceNumber } : null,
          payment.verifiedAt
            ? { label: "Reviewed", value: `${formatDateTime(payment.verifiedAt)}${payment.verifiedByName ? ` by ${payment.verifiedByName}` : ""}` }
            : null,
          payment.rejectionReason ? { label: "Rejection reason", value: payment.rejectionReason, wide: true } : null,
        ]}
      />

      {reviewable && (
        <div className="payment-review">
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}
          {rejecting ? (
            <div className="form-row">
              <label htmlFor="reject-reason">Reason shown to the applicant</label>
              <textarea id="reject-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The amount doesn't match, or the receipt is unreadable." />
            </div>
          ) : (
            <div className="form-row">
              <label htmlFor="invoice">Sales invoice (SI) number (optional now, required when releasing the permit)</label>
              <input id="invoice" type="text" maxLength={50} value={invoice} onChange={(e) => setInvoice(e.target.value)} />
            </div>
          )}
        </div>
      )}
      {payment.status === "Verified" && (
        <div className="payment-review">
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}
          <div className="form-row">
            <label htmlFor="invoice-edit">Sales invoice (SI) number</label>
            <input id="invoice-edit" type="text" maxLength={50} value={invoice} onChange={(e) => setInvoice(e.target.value)} />
          </div>
        </div>
      )}
      {!reviewable && payment.status !== "Verified" && errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
    </>
  );

  const actions = reviewable ? (
    rejecting ? (
      <>
        <button type="button" className="btn btn-secondary" onClick={() => setRejecting(false)} disabled={isSaving}>
          Back
        </button>
        <button type="button" className="btn btn-danger" onClick={handleReject} disabled={isSaving}>
          {isSaving ? "Rejecting..." : "Confirm rejection"}
        </button>
      </>
    ) : (
      <>
        <button type="button" className="btn btn-secondary" onClick={() => setRejecting(true)} disabled={isSaving}>
          Reject
        </button>
        <button type="button" className="btn btn-primary" onClick={handleVerify} disabled={isSaving}>
          {isSaving ? "Verifying..." : "Verify payment"}
        </button>
      </>
    )
  ) : payment.status === "Verified" ? (
    <button type="button" className="btn btn-primary" onClick={handleSaveInvoice} disabled={isSaving || invoice.trim() === (payment.invoiceNumber ?? "")}>
      {isSaving ? "Saving..." : payment.invoiceNumber ? "Update SI number" : "Save SI number"}
    </button>
  ) : null;

  return (
    <FilePreviewModal
      title="Proof of payment"
      subtitle={`${payment.applicantName} · ${payment.applicantEmail}`}
      fileName={payment.proofFileName}
      loadFile={() => getPaymentProofFile(payment.paymentId)}
      details={details}
      actions={actions}
      busy={isSaving}
      onClose={onClose}
    />
  );
}

export default function StaffPaymentsPage() {
  const [status, setStatus] = useState("Pending");
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setPayments(await listExamPayments(status));
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load payments.");
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (row) => row.applicantName,
      sortable: true,
      render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
    },
    { key: "course", header: "Course", accessor: (row) => row.courseAppliedFor, sortable: true },
    {
      key: "amount",
      header: "Amount",
      accessor: (row) => row.amount,
      sortable: true,
      render: (row) => peso(row.amount),
    },
    {
      key: "invoice",
      header: "SI no.",
      accessor: (row) => row.invoiceNumber ?? "",
      sortable: true,
      render: (row) => row.invoiceNumber ?? <span className="ui-cell-muted">-</span>,
    },
    { key: "reference", header: "Reference", accessor: (row) => row.referenceNumber ?? "", render: (row) => row.referenceNumber ?? <span className="ui-cell-muted">-</span> },
    {
      key: "status",
      header: "Status",
      accessor: (row) => row.status,
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "uploaded",
      header: "Proof uploaded",
      accessor: (row) => row.proofUploadedAt,
      sortable: true,
      render: (row) => formatDateTime(row.proofUploadedAt),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      searchable: false,
      render: (row) => (
        <RowAction
          label={row.status === "Pending" ? "Review" : "View"}
          icon="eye"
          onClick={() => setReviewing(row)}
          ariaLabel={`${row.status === "Pending" ? "Review" : "View"} ${row.applicantName}'s payment`}
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Payment Verification"
        subtitle="Entrance exam payments. Open the proof of payment, then verify it or reject it with a reason the applicant will see."
        columns={columns}
        rows={payments}
        getRowKey={(row) => row.paymentId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage={status === "Pending" ? "No payments are waiting for verification." : "No payments match this filter."}
        onRowClick={(row) => setReviewing(row)}
        searchPlaceholder="Search by applicant or course"
        filters={[
          {
            key: "status",
            label: "All statuses",
            value: status,
            onChange: setStatus,
            options: PAYMENT_STATUSES.map((value) => ({ value, label: value })),
          },
        ]}
      />

      {reviewing && <PaymentReview payment={reviewing} onClose={() => setReviewing(null)} onChanged={load} />}
    </AppLayout>
  );
}
