import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApplicationsReadyForDecision } from "../api/academicHeadScholarshipApplicationsApi.js";
import { getAdminDashboard } from "../api/adminDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card, { StatCard } from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./AcademicHeadDashboardPage.css";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AcademicHeadDashboardPage() {
  const [queue, setQueue] = useState([]);
  const [oversight, setOversight] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getApplicationsReadyForDecision(), getAdminDashboard()])
      .then(([queueData, oversightData]) => {
        if (cancelled) return;
        setQueue(queueData);
        setOversight(oversightData);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load dashboard.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppLayout title="Academic Head Dashboard">
      {isLoading && (
        <Card>
          <p>Loading...</p>
        </Card>
      )}

      {errorMessage && (
        <Card>
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        </Card>
      )}

      {!isLoading && !errorMessage && (
        <>
          <Card>
            <h2>Applications Awaiting Decision</h2>
            {queue.length === 0 && <p>No scholarship applications are waiting on a final decision.</p>}
            {queue.length > 0 && (
              <ul className="ah-queue-list">
                {queue.map((application) => (
                  <li key={application.applicationId}>
                    <Link
                      className="ah-queue-link"
                      to={`/academic-head/scholarship-applications/${application.applicationId}`}
                    >
                      <div className="ah-queue-header">
                        <span className="ah-queue-name">{application.applicantName}</span>
                        <StatusBadge status={application.status} />
                      </div>
                      <p className="ah-queue-meta">
                        {application.scholarshipName} &middot; {application.scholarshipType} &middot; Grade
                        Average {application.gradeAverage} &middot; Submitted{" "}
                        {formatDate(application.submittedAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {oversight && (
            <>
              <div className="ah-oversight-heading">
                <h2>Admissions Oversight (Admin-Registrar)</h2>
                <p>Read-only, for context in approval decisions.</p>
              </div>

              <section className="ah-stat-grid">
                <StatCard label="Total Applications" value={oversight.totalApplications} />
                <StatCard label="Total Applicants" value={oversight.totalApplicants} />
                <StatCard label="Pending" value={oversight.pendingCount} />
                <StatCard label="Approved" value={oversight.approvedCount} />
                <StatCard label="Rejected" value={oversight.rejectedCount} />
              </section>
            </>
          )}
        </>
      )}
    </AppLayout>
  );
}
