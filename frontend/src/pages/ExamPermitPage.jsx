import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { inputClasses, labelClasses, primaryButtonClasses } from "../lib/formStyles.js";
import { getMyExamPermit, getMyRescheduleRequest, submitRescheduleRequest } from "../api/examPermitApi.js";
import { ApiError } from "../api/apiClient.js";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(isoTime) {
  const [hours, minutes] = isoTime.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Shell({ children }) {
  return (
    <main className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link to="/portal" className="print:hidden inline-block text-sm font-semibold text-forest hover:underline">
          ← Back to dashboard
        </Link>
        {children}
      </div>
    </main>
  );
}

export default function ExamPermitPage() {
  const [permit, setPermit] = useState(null);
  const [rescheduleRequest, setRescheduleRequest] = useState(null);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [noPermitYet, setNoPermitYet] = useState(false);
  const [permitPending, setPermitPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [rescheduleError, setRescheduleError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getMyExamPermit(), getMyRescheduleRequest()])
      .then(([permitData, requestData]) => {
        if (cancelled) return;
        setPermit(permitData);
        setRescheduleRequest(requestData);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 400) {
          if (error.message.toLowerCase().includes("released")) {
            setPermitPending(true);
          } else {
            setNoPermitYet(true);
          }
        } else {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load your exam permit.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmitReschedule(event) {
    event.preventDefault();
    setRescheduleError(null);
    setIsSubmitting(true);

    try {
      const created = await submitRescheduleRequest(reason);
      setRescheduleRequest(created);
      setReason("");
    } catch (error) {
      setRescheduleError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Shell>
        <p className="mt-4 text-sm text-slate-400">Loading...</p>
      </Shell>
    );
  }

  if (noPermitYet) {
    return (
      <Shell>
        <div className="mt-4 rounded-xl bg-white p-6 shadow-card">
          <h1 className="text-xl font-extrabold text-slate-900">Exam Permit</h1>
          <p className="mt-2 text-sm text-slate-600">
            You haven't selected an entrance exam schedule yet.{" "}
            <Link to="/exam-schedule" className="font-semibold text-forest hover:underline">
              Choose a schedule
            </Link>{" "}
            to have your permit issued.
          </p>
        </div>
      </Shell>
    );
  }

  if (permitPending) {
    return (
      <Shell>
        <div className="mt-4 rounded-xl bg-white p-6 shadow-card">
          <h1 className="text-xl font-extrabold text-slate-900">Exam Permit</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your exam permit hasn't been released yet. The registrar releases it once all of your required documents
            have been verified — check your{" "}
            <Link to="/documents" className="font-semibold text-forest hover:underline">
              Documents
            </Link>{" "}
            checklist for status.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {errorMessage && (
        <p className="print:hidden mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      {permit && (
        <div className="mt-4 rounded-xl border-t-4 border-forest bg-white p-8 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest">BCAS Entrance Exam Permit</p>
          <p className="mt-1 font-mono text-lg font-bold text-slate-900">{permit.permitNumber}</p>

          <dl className="mt-6 divide-y divide-slate-100">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-slate-500">Schedule</dt>
              <dd className="text-sm font-semibold text-slate-800">{permit.dayType}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-slate-500">Date</dt>
              <dd className="text-sm font-semibold text-slate-800">{formatDate(permit.examDate)}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-slate-500">Time</dt>
              <dd className="text-sm font-semibold text-slate-800">{formatTime(permit.examTime)}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-slate-500">Venue</dt>
              <dd className="text-sm font-semibold text-slate-800">{permit.venue}</dd>
            </div>
          </dl>

          <button type="button" onClick={() => window.print()} className={`${primaryButtonClasses} print:hidden mt-6`}>
            Print / Save as PDF
          </button>
        </div>
      )}

      <div className="print:hidden mt-6 rounded-xl bg-white p-6 shadow-card">
        <h2 className="font-bold text-slate-900">Reschedule Request</h2>

        {rescheduleRequest && (
          <div className="mt-3">
            <StatusBadge status={rescheduleRequest.status} />
            <p className="mt-2 text-sm italic text-slate-600">"{rescheduleRequest.reason}"</p>
          </div>
        )}

        {rescheduleRequest?.status === "Pending" && (
          <p className="mt-3 text-sm text-slate-500">
            Your request is awaiting review. You'll see an updated permit above once it's approved.
          </p>
        )}

        {(!rescheduleRequest || rescheduleRequest.status !== "Pending") && (
          <form onSubmit={handleSubmitReschedule} noValidate className="mt-3 space-y-4">
            <p className="text-sm text-slate-500">
              Unable to attend your assigned schedule? Tell us why and we'll review your request.
            </p>

            <div>
              <label className={labelClasses} htmlFor="reason">
                Reason
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={4}
                maxLength={500}
                required
                className={inputClasses}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>

            {rescheduleError && (
              <p className="text-sm font-medium text-status-red" role="alert">
                {rescheduleError}
              </p>
            )}

            <button type="submit" disabled={isSubmitting || reason.trim().length === 0} className={primaryButtonClasses}>
              {isSubmitting ? "Submitting..." : "Request Reschedule"}
            </button>
          </form>
        )}
      </div>
    </Shell>
  );
}
