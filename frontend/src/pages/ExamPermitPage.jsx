import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyExamPermit, getMyRescheduleRequest, submitRescheduleRequest } from "../api/examPermitApi.js";
import { ApiError } from "../api/apiClient.js";
import ExamSlip from "../components/ExamSlip.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import "./ExamPermitPage.css";

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
      <AppLayout title="Exam Permit">
        <Card>
          <p>Loading...</p>
        </Card>
      </AppLayout>
    );
  }

  if (noPermitYet) {
    return (
      <AppLayout title="Exam Permit">
        <Card>
          <EmptyState
            icon="ticket"
            title="No exam schedule selected yet"
            message="Choose an entrance exam schedule to have your permit issued."
            action={
              <Link className="btn btn-primary btn-sm" to="/exam-schedule">
                Choose a schedule
              </Link>
            }
          />
        </Card>
      </AppLayout>
    );
  }

  if (permitPending) {
    return (
      <AppLayout title="Exam Permit">
        <Card>
          <EmptyState
            icon="lock"
            title="Your permit hasn't been released yet"
            message="The registrar releases it once all of your required documents have been verified."
            action={
              <Link className="btn btn-secondary btn-sm" to="/documents">
                Check your Documents checklist
              </Link>
            }
          />
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Exam Permit">
      {errorMessage && (
        <p className="form-error no-print" role="alert">
          {errorMessage}
        </p>
      )}

      {permit && (
        <div className="permit">
          <ExamSlip permit={permit} />
          <button type="button" className="no-print" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
      )}

      <Card className="no-print reschedule-card">
        <h2>Reschedule Request</h2>

        {rescheduleRequest && (
          <div className="reschedule-status">
            <StatusBadge status={rescheduleRequest.status} />
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
      </Card>
    </AppLayout>
  );
}
