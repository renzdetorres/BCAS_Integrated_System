import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyExamPermit, getMyRescheduleRequest, submitRescheduleRequest } from "../api/examPermitApi.js";
import { ApiError } from "../api/apiClient.js";
import "./ExamPermitPage.css";

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
      <main className="exam-permit-page">
        <div className="exam-permit-shell">
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  if (noPermitYet) {
    return (
      <main className="exam-permit-page">
        <div className="exam-permit-shell">
          <Link className="exam-permit-back-link no-print" to="/portal">
            &larr; Back to dashboard
          </Link>
          <section className="exam-permit-card">
            <h1>Exam Permit</h1>
            <p>
              You haven&apos;t selected an entrance exam schedule yet.{" "}
              <Link to="/exam-schedule">Choose a schedule</Link> to have your permit issued.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (permitPending) {
    return (
      <main className="exam-permit-page">
        <div className="exam-permit-shell">
          <Link className="exam-permit-back-link no-print" to="/portal">
            &larr; Back to dashboard
          </Link>
          <section className="exam-permit-card">
            <h1>Exam Permit</h1>
            <p>
              Your exam permit hasn&apos;t been released yet. The registrar releases it once all of your required
              documents have been verified - check your <Link to="/documents">Documents</Link> checklist for status.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="exam-permit-page">
      <div className="exam-permit-shell">
        <Link className="exam-permit-back-link no-print" to="/portal">
          &larr; Back to dashboard
        </Link>

        {errorMessage && (
          <p className="form-error no-print" role="alert">
            {errorMessage}
          </p>
        )}

        {permit && (
          <section className="exam-permit-card permit">
            <p className="permit-eyebrow">BCAS Entrance Exam Permit</p>
            <p className="permit-number">{permit.permitNumber}</p>

            <dl className="permit-details">
              <div>
                <dt>Schedule</dt>
                <dd>{permit.dayType}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(permit.examDate)}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{formatTime(permit.examTime)}</dd>
              </div>
              <div>
                <dt>Venue</dt>
                <dd>{permit.venue}</dd>
              </div>
            </dl>

            <button type="button" className="no-print" onClick={() => window.print()}>
              Print / Save as PDF
            </button>
          </section>
        )}

        <section className="exam-permit-card no-print">
          <h2>Reschedule Request</h2>

          {rescheduleRequest && (
            <div className="reschedule-status">
              <span className={`reschedule-badge status-${rescheduleRequest.status.toLowerCase()}`}>
                {rescheduleRequest.status}
              </span>
              <p className="reschedule-reason">&ldquo;{rescheduleRequest.reason}&rdquo;</p>
            </div>
          )}

          {rescheduleRequest?.status === "Pending" && (
            <p>Your request is awaiting review. You&apos;ll see an updated permit above once it&apos;s approved.</p>
          )}

          {(!rescheduleRequest || rescheduleRequest.status !== "Pending") && (
            <form onSubmit={handleSubmitReschedule} noValidate>
              <p>Unable to attend your assigned schedule? Tell us why and we&apos;ll review your request.</p>

              {rescheduleError && (
                <p className="form-error" role="alert">
                  {rescheduleError}
                </p>
              )}

              <div className="form-row">
                <label htmlFor="reason">Reason</label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  maxLength={500}
                  required
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>

              <button type="submit" disabled={isSubmitting || reason.trim().length === 0}>
                {isSubmitting ? "Submitting..." : "Request Reschedule"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
