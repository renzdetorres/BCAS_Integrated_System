import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMyApplicationHistory } from "../api/applicationHistoryApi.js";
import { APPLICATION_TYPES } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import BcasSeal from "../components/ui/BcasSeal.jsx";
import "./ApplicationReceiptPage.css";

function formatTimestamp(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function admissionTypeLabel(applicationType) {
  return APPLICATION_TYPES.find((t) => t.value === applicationType)?.label ?? applicationType;
}

export default function ApplicationReceiptPage() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getMyApplicationHistory()
      .then((data) => {
        if (cancelled) return;
        setApplication(data.find((a) => a.applicationId === applicationId) ?? null);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load your receipt.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  return (
    <AppLayout title="Application Receipt">
      {isLoading && (
        <Card>
          <p>Loading...</p>
        </Card>
      )}

      {!isLoading && errorMessage && (
        <Card>
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        </Card>
      )}

      {!isLoading && !errorMessage && !application && (
        <Card>
          <p>No application found with that id.</p>
        </Card>
      )}

      {!isLoading && application && (
        <Card className="receipt">
          <div className="receipt-letterhead">
            <BcasSeal size={40} />
            <div>
              <p className="receipt-eyebrow">BCAS Application Confirmation Receipt</p>
              <p className="receipt-application-id">{application.applicationId}</p>
            </div>
          </div>

          <dl className="receipt-details">
            <div>
              <dt>Category</dt>
              <dd>{application.category}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={application.status} />
              </dd>
            </div>

            {application.category === "Admission" && (
              <>
                <div>
                  <dt>Application type</dt>
                  <dd>{admissionTypeLabel(application.applicationType)}</dd>
                </div>
                <div>
                  <dt>Course applied for</dt>
                  <dd>{application.courseAppliedFor}</dd>
                </div>
                <div>
                  <dt>Previous school</dt>
                  <dd>{application.previousSchool}</dd>
                </div>
              </>
            )}

            {application.category === "Scholarship" && (
              <>
                <div>
                  <dt>Scholarship</dt>
                  <dd>{application.scholarshipName}</dd>
                </div>
                <div>
                  <dt>Scholarship type</dt>
                  <dd>{application.scholarshipType}</dd>
                </div>
                <div>
                  <dt>Grade average</dt>
                  <dd>{application.gradeAverage}</dd>
                </div>
              </>
            )}

            <div>
              <dt>Submitted</dt>
              <dd>{formatTimestamp(application.submittedAt)}</dd>
            </div>
          </dl>

          <button type="button" className="no-print" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </Card>
      )}
    </AppLayout>
  );
}
