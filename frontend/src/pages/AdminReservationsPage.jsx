import { useCallback, useEffect, useState } from "react";
import { listReservations, recordReservation } from "../api/adminReservationsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./AdminReservationsPage.css";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ReservationRow({ reservation, onSaved }) {
  const [isReserved, setIsReserved] = useState(reservation.isReserved);
  const [remarks, setRemarks] = useState(reservation.remarks ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await recordReservation(reservation.applicationId, { isReserved, remarks });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record the reservation.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <li className="reservation-row">
      <div className="reservation-row-header">
        <div>
          <span className="reservation-applicant-name">{reservation.applicantName}</span>
          <span className="reservation-applicant-email">{reservation.applicantEmail}</span>
        </div>
        <StatusBadge status={reservation.isReserved ? "Active" : "Inactive"} label={reservation.isReserved ? "Reserved" : "Unreserved"} />
      </div>
      <p className="reservation-meta">
        {reservation.applicationType} &middot; {reservation.courseAppliedFor} &middot; Submitted{" "}
        {formatDate(reservation.submittedAt)}
      </p>

      {reservation.recordedAt && (
        <p className="reservation-recorded">
          {reservation.reservationFee != null && <>Fee &#8369;{reservation.reservationFee.toFixed(2)} &middot; </>}
          Last recorded {formatDateTime(reservation.recordedAt)}
          {reservation.recordedByName && <> by {reservation.recordedByName}</>}
        </p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="reservation-form">
        <div className="reservation-toggle-group" role="radiogroup" aria-label="Reservation status">
          <button
            type="button"
            className={isReserved ? "toggle-option toggle-option-selected" : "toggle-option"}
            aria-pressed={isReserved}
            onClick={() => setIsReserved(true)}
          >
            Reserved
          </button>
          <button
            type="button"
            className={!isReserved ? "toggle-option toggle-option-selected" : "toggle-option"}
            aria-pressed={!isReserved}
            onClick={() => setIsReserved(false)}
          >
            Unreserved
          </button>
        </div>
        <input
          type="text"
          className="reservation-remarks-input"
          placeholder="Remarks (optional, e.g. receipt number)"
          maxLength={500}
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
        />
        <button type="button" className="reservation-save" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </li>
  );
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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

  function handleSaved(updated) {
    setReservations((prev) => prev.map((r) => (r.applicationId === updated.applicationId ? updated : r)));
  }

  const unreserved = reservations.filter((r) => !r.isReserved);
  const reserved = reservations.filter((r) => r.isReserved);

  return (
    <AppLayout title="Reservations">
        <p className="admin-reservations-subtitle">
          Record whether an approved applicant has reserved their slot. This only tracks status recorded by staff -
          it never processes the reservation fee itself (see Admin Settings for the online-payment toggle).
        </p>

        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : reservations.length === 0 ? (
          <Card>
            <p>No approved admission applications yet.</p>
          </Card>
        ) : (
          <>
            <Card>
              <h2>Unreserved ({unreserved.length})</h2>
              {unreserved.length === 0 ? (
                <p>Every approved applicant has reserved their slot.</p>
              ) : (
                <ul className="reservation-list">
                  {unreserved.map((reservation) => (
                    <ReservationRow
                      key={reservation.applicationId}
                      reservation={reservation}
                      onSaved={handleSaved}
                    />
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2>Reserved ({reserved.length})</h2>
              {reserved.length === 0 ? (
                <p>No reservations recorded yet.</p>
              ) : (
                <ul className="reservation-list">
                  {reserved.map((reservation) => (
                    <ReservationRow
                      key={reservation.applicationId}
                      reservation={reservation}
                      onSaved={handleSaved}
                    />
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
    </AppLayout>
  );
}
