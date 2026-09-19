import { useCallback, useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { inputClasses, primaryButtonClasses } from "../lib/formStyles.js";
import { listReservations, recordReservation } from "../api/adminReservationsApi.js";
import { ApiError } from "../api/apiClient.js";

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
    <div className="rounded-lg border border-slate-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800">{reservation.applicantName}</p>
          <p className="text-xs text-slate-400">{reservation.applicantEmail}</p>
        </div>
        <StatusBadge status={reservation.isReserved ? "Reserved" : "Unreserved"} />
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {reservation.applicationType} · {reservation.courseAppliedFor} · Submitted {formatDate(reservation.submittedAt)}
      </p>

      {reservation.recordedAt && (
        <p className="mt-1 text-xs text-slate-400">
          {reservation.reservationFee != null && <>Fee ₱{reservation.reservationFee.toFixed(2)} · </>}
          Last recorded {formatDateTime(reservation.recordedAt)}
          {reservation.recordedByName && <> by {reservation.recordedByName}</>}
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm font-medium text-status-red" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-slate-300" role="radiogroup" aria-label="Reservation status">
          <button
            type="button"
            aria-pressed={isReserved}
            onClick={() => setIsReserved(true)}
            className={`px-3 py-1.5 text-sm font-semibold ${
              isReserved ? "bg-forest text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Reserved
          </button>
          <button
            type="button"
            aria-pressed={!isReserved}
            onClick={() => setIsReserved(false)}
            className={`border-l border-slate-300 px-3 py-1.5 text-sm font-semibold ${
              !isReserved ? "bg-forest text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            Unreserved
          </button>
        </div>
        <input
          type="text"
          placeholder="Remarks (optional, e.g. receipt number)"
          maxLength={500}
          className={`${inputClasses} max-w-xs`}
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
        />
        <button type="button" onClick={handleSave} disabled={isSaving} className={primaryButtonClasses}>
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
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
    <AppShell>
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Reservations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Record whether an approved applicant has reserved their slot. This only tracks status recorded by staff —
          it never processes the reservation fee itself (see Admin Settings for the online-payment toggle).
        </p>
      </div>

      {loadError && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {loadError}
        </p>
      )}

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-400">Loading...</p>
      ) : reservations.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-slate-400">No approved admission applications yet.</p>
        </Card>
      ) : (
        <>
          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Unreserved ({unreserved.length})</h2>
            {unreserved.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Every approved applicant has reserved their slot.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {unreserved.map((reservation) => (
                  <ReservationRow key={reservation.applicationId} reservation={reservation} onSaved={handleSaved} />
                ))}
              </div>
            )}
          </Card>

          <Card className="mt-6">
            <h2 className="font-bold text-slate-900">Reserved ({reserved.length})</h2>
            {reserved.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No reservations recorded yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {reserved.map((reservation) => (
                  <ReservationRow key={reservation.applicationId} reservation={reservation} onSaved={handleSaved} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}
