import { useCallback, useEffect, useMemo, useState } from "react";
import { listReservations, recordReservation } from "../api/adminReservationsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import Modal, { DetailList } from "../components/ui/Modal.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatDate, formatDateTime, formatPeso } from "../utils/format.js";
import "./AdminReservationsPage.css";

const APPLICATION_TYPE_LABELS = { NewStudent: "New Student", Transferee: "Transferee" };

function ReservationBadge({ isReserved }) {
  return <StatusBadge status={isReserved ? "Active" : "Inactive"} label={isReserved ? "Reserved" : "Not reserved"} />;
}

/** Reservation details, and where staff record whether the slot is reserved. */
function ReservationModal({ reservation, onClose, onSaved }) {
  const [isReserved, setIsReserved] = useState(reservation.isReserved);
  const [remarks, setRemarks] = useState(reservation.remarks ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const unchanged = isReserved === reservation.isReserved && remarks === (reservation.remarks ?? "");

  async function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updated = await recordReservation(reservation.applicationId, { isReserved, remarks });
      onSaved(updated);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to record the reservation.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSaving}
      title={reservation.applicantName}
      subtitle={`${reservation.applicantEmail} · ${reservation.courseAppliedFor}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Close
          </button>
          <button type="submit" form="reservation-form" className="btn btn-primary" disabled={isSaving || unchanged}>
            {isSaving ? "Saving..." : "Save reservation"}
          </button>
        </>
      }
    >
      <div className="ui-modal-section">
        <DetailList
          items={[
            { label: "Status", value: <ReservationBadge isReserved={reservation.isReserved} /> },
            { label: "Application type", value: APPLICATION_TYPE_LABELS[reservation.applicationType] ?? reservation.applicationType },
            { label: "Course", value: reservation.courseAppliedFor },
            { label: "Application submitted", value: formatDate(reservation.submittedAt) },
            { label: "Reservation fee", value: reservation.reservationFee != null ? formatPeso(reservation.reservationFee) : null },
            {
              label: "Last recorded",
              value: reservation.recordedAt
                ? `${formatDateTime(reservation.recordedAt)}${reservation.recordedByName ? ` by ${reservation.recordedByName}` : ""}`
                : "Never",
            },
          ]}
        />
      </div>
      <form id="reservation-form" className="ui-modal-section" onSubmit={handleSave} noValidate>
        <h3 className="ui-modal-section-title">Record reservation</h3>
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="reservation-choice" role="radiogroup" aria-label="Reservation status">
          {[
            { value: true, label: "Reserved", hint: "The applicant has paid and holds their slot." },
            { value: false, label: "Not reserved", hint: "No reservation recorded yet." },
          ].map((option) => (
            <label key={option.label} className={`reservation-option${isReserved === option.value ? " is-selected" : ""}`}>
              <input
                type="radio"
                name="isReserved"
                checked={isReserved === option.value}
                onChange={() => setIsReserved(option.value)}
              />
              <span>
                {option.label}
                <small>{option.hint}</small>
              </span>
            </label>
          ))}
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="reservation-remarks">
            Remarks
          </label>
          <input
            id="reservation-remarks"
            type="text"
            className="ui-input"
            maxLength={500}
            placeholder="Optional, e.g. official receipt number"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
          />
          <p className="ui-hint">This only records the status. Fees are never processed here.</p>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminReservationsPage() {
  const { showToast } = useToast();
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [viewing, setViewing] = useState(null);

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listReservations();
      setReservations(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load reservations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const rows = useMemo(
    () =>
      reservations.filter(
        (r) =>
          (!statusFilter || (statusFilter === "reserved" ? r.isReserved : !r.isReserved)) &&
          (!typeFilter || r.applicationType === typeFilter),
      ),
    [reservations, statusFilter, typeFilter],
  );

  const reservedCount = reservations.filter((r) => r.isReserved).length;

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (row) => `${row.applicantName} ${row.applicantEmail}`,
      sortable: true,
      render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
    },
    {
      key: "course",
      header: "Course",
      accessor: (row) => row.courseAppliedFor,
      sortable: true,
      render: (row) => (
        <PersonCell name={row.courseAppliedFor} detail={APPLICATION_TYPE_LABELS[row.applicationType] ?? row.applicationType} />
      ),
    },
    {
      key: "status",
      header: "Reservation",
      accessor: (row) => (row.isReserved ? "Reserved" : "Not reserved"),
      sortable: true,
      render: (row) => <ReservationBadge isReserved={row.isReserved} />,
    },
    {
      key: "fee",
      header: "Fee",
      align: "right",
      accessor: (row) => row.reservationFee ?? -1,
      sortable: true,
      searchable: false,
      render: (row) => (row.reservationFee != null ? formatPeso(row.reservationFee) : <span className="ui-cell-muted">-</span>),
    },
    {
      key: "recordedAt",
      header: "Last recorded",
      accessor: (row) => row.recordedAt ?? "",
      sortable: true,
      searchable: false,
      render: (row) => (row.recordedAt ? formatDate(row.recordedAt) : <span className="ui-cell-muted">Never</span>),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      searchable: false,
      render: (row) => (
        <RowAction
          label="View"
          icon="bookmark"
          onClick={() => setViewing(row)}
          ariaLabel={`View ${row.applicantName}'s reservation`}
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Reservations"
        subtitle="Whether each approved admission applicant has reserved their slot. Staff record the status here; the reservation fee itself is never processed in this system."
        summary={[
          { label: "Approved applicants", value: reservations.length.toLocaleString() },
          { label: "Reserved", value: reservedCount.toLocaleString(), tone: "green" },
          { label: "Not reserved", value: (reservations.length - reservedCount).toLocaleString(), tone: "amber" },
        ]}
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        errorMessage={loadError}
        emptyMessage={reservations.length === 0 ? "No approved admission applications yet." : "No reservations match these filters."}
        onRowClick={(row) => setViewing(row)}
        searchPlaceholder="Search by applicant, email or course"
        filters={[
          {
            key: "status",
            label: "Any reservation status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "reserved", label: "Reserved" },
              { value: "not-reserved", label: "Not reserved" },
            ],
          },
          {
            key: "type",
            label: "All application types",
            value: typeFilter,
            onChange: setTypeFilter,
            options: Object.entries(APPLICATION_TYPE_LABELS).map(([value, label]) => ({ value, label })),
          },
        ]}
      />

      {viewing ? (
        <ReservationModal
          reservation={viewing}
          onClose={() => setViewing(null)}
          onSaved={(updated) => {
            setReservations((prev) => prev.map((r) => (r.applicationId === updated.applicationId ? updated : r)));
            setViewing(null);
            showToast(`${updated.applicantName} marked ${updated.isReserved ? "reserved" : "not reserved"}.`);
          }}
        />
      ) : null}
    </AppLayout>
  );
}
