import { useCallback, useEffect, useMemo, useState } from "react";
import { listExamPermits, releaseExamPermit } from "../api/adminExamPermitsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import ExamSlip from "../components/ExamSlip.jsx";
import Modal from "../components/ui/Modal.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCalendarDate, formatDateTime, formatTime } from "../utils/format.js";
import "./AdminExamPermitsPage.css";

function examLabel(permit) {
  return `${formatCalendarDate(permit.examDate)} at ${formatTime(permit.examTime)}`;
}

function PermitModal({ permit, isReleasing, onRelease, onClose }) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const canRelease = !permit.isReleased && permit.documentsVerified && invoiceNumber.trim().length > 0;
  return (
    <Modal
      open
      onClose={onClose}
      busy={isReleasing}
      size="lg"
      title="Exam permit"
      subtitle={`${permit.applicantName} · ${permit.applicantEmail}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isReleasing}>
            Close
          </button>
          {!permit.isReleased ? (
            <button type="button" className="btn btn-primary" onClick={() => onRelease(permit, invoiceNumber.trim())} disabled={!canRelease || isReleasing}>
              {isReleasing ? "Releasing..." : "Generate & release permit"}
            </button>
          ) : null}
        </>
      }
    >
      <ExamSlip permit={permit} released={permit.isReleased} />
      <dl className="permit-status">
        <div>
          <dt>Permit</dt>
          <dd>
            {permit.isReleased ? `Released ${formatDateTime(permit.releasedAt)}` : <StatusBadge status="Pending" label="Not released" />}
          </dd>
        </div>
        <div>
          <dt>Required documents</dt>
          <dd>
            <StatusBadge
              status={permit.documentsVerified ? "Verified" : "Pending"}
              label={permit.documentsVerified ? "All verified" : "Not all verified"}
            />
          </dd>
        </div>
      </dl>
      {!permit.isReleased && permit.documentsVerified ? (
        <div className="form-row permit-invoice">
          <label htmlFor="invoiceNumber">Invoice (SI) number</label>
          <input
            id="invoiceNumber"
            value={invoiceNumber}
            maxLength={50}
            placeholder="From the cashier's receipt"
            onChange={(event) => setInvoiceNumber(event.target.value)}
          />
        </div>
      ) : null}
      {!permit.isReleased && !permit.documentsVerified ? (
        <p className="permit-blocked">
          The permit can be released once Support Staff have verified every required document for this applicant.
        </p>
      ) : null}
    </Modal>
  );
}

export default function AdminExamPermitsPage() {
  const { showToast } = useToast();
  const [permits, setPermits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [releasingUserId, setReleasingUserId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [documentsFilter, setDocumentsFilter] = useState("");

  const loadPermits = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listExamPermits();
      setPermits(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load exam permits.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermits();
  }, [loadPermits]);

  async function handleRelease(permit, invoiceNumber) {
    setReleasingUserId(permit.userId);
    try {
      const updated = await releaseExamPermit(permit.userId, invoiceNumber);
      setPermits((prev) => prev.map((p) => (p.userId === updated.userId ? updated : p)));
      setViewing(updated);
      showToast(`Permit ${updated.permitNumber} released to ${updated.applicantName}.`);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to release the exam permit.", "error");
    } finally {
      setReleasingUserId(null);
    }
  }

  const rows = useMemo(
    () =>
      permits.filter(
        (p) =>
          (!statusFilter || (statusFilter === "released" ? p.isReleased : !p.isReleased)) &&
          (!documentsFilter || (documentsFilter === "verified" ? p.documentsVerified : !p.documentsVerified)),
      ),
    [permits, statusFilter, documentsFilter],
  );

  const pendingCount = permits.filter((p) => !p.isReleased).length;
  const readyCount = permits.filter((p) => !p.isReleased && p.documentsVerified).length;
  const releasedCount = permits.length - pendingCount;

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (row) => `${row.applicantName} ${row.applicantEmail}`,
      sortable: true,
      render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
    },
    {
      key: "exam",
      header: "Exam",
      accessor: (row) => `${row.examDate}T${row.examTime} ${row.venue}`,
      sortable: true,
      render: (row) => <PersonCell name={examLabel(row)} detail={row.venue} />,
    },
    {
      key: "documents",
      header: "Documents",
      accessor: (row) => (row.documentsVerified ? "Verified" : "Pending"),
      sortable: true,
      render: (row) => (
        <StatusBadge
          status={row.documentsVerified ? "Verified" : "Pending"}
          label={row.documentsVerified ? "Verified" : "Pending"}
        />
      ),
    },
    {
      key: "permit",
      header: "Permit",
      accessor: (row) => (row.isReleased ? row.permitNumber : ""),
      sortable: true,
      render: (row) =>
        row.isReleased ? (
          <PersonCell name={<span className="permit-number">{row.permitNumber}</span>} detail={`Released ${formatDateTime(row.releasedAt)}`} />
        ) : (
          <span className="ui-cell-muted">Not released</span>
        ),
    },
    {
      key: "action",
      header: "Action",
      align: "center",
      searchable: false,
      render: (row) => (
        <RowAction
          label={!row.isReleased && row.documentsVerified ? "Review & release" : "View permit"}
          icon="ticket"
          onClick={() => setViewing(row)}
          ariaLabel={`Open ${row.applicantName}'s exam permit`}
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Exam Permits"
        subtitle="Generate and release entrance exam permits. A permit can only be released once all of the applicant's required documents are verified."
        summary={[
          { label: "Awaiting release", value: pendingCount.toLocaleString(), tone: "amber" },
          { label: "Ready to release", value: readyCount.toLocaleString(), tone: "green" },
          { label: "Released", value: releasedCount.toLocaleString() },
        ]}
        summaryNote="Ready to release means every required document is verified."
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.userId}
        isLoading={isLoading}
        errorMessage={loadError}
        emptyMessage={permits.length === 0 ? "No applicant has picked an exam schedule yet." : "No permits match these filters."}
        searchPlaceholder="Search by applicant, email or permit number"
        filters={[
          {
            key: "status",
            label: "Any release status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "pending", label: "Awaiting release" },
              { value: "released", label: "Released" },
            ],
          },
          {
            key: "documents",
            label: "Any document status",
            value: documentsFilter,
            onChange: setDocumentsFilter,
            options: [
              { value: "verified", label: "Documents verified" },
              { value: "pending", label: "Documents pending" },
            ],
          },
        ]}
      />

      {viewing ? (
        <PermitModal
          permit={viewing}
          isReleasing={releasingUserId === viewing.userId}
          onRelease={handleRelease}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </AppLayout>
  );
}
