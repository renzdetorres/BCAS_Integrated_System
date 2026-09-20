import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApplicationsReadyForDecision } from "../api/academicHeadScholarshipApplicationsApi.js";
import { getAdminDashboard } from "../api/adminDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import "./AcademicHeadDashboardPage.css";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysWaiting(isoDateTime) {
  const days = Math.floor((Date.now() - new Date(isoDateTime).getTime()) / 86400000);
  if (days <= 0) return "Today";
  return `${days} day${days === 1 ? "" : "s"}`;
}

export default function AcademicHeadDashboardPage() {
  const navigate = useNavigate();
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

  const columns = [
    { key: "applicantName", header: "Applicant", sortable: true },
    {
      key: "scholarship",
      header: "Scholarship",
      accessor: (row) => row.scholarshipName,
      sortable: true,
      render: (row) => (
        <div className="ah-scholarship-cell">
          <span>{row.scholarshipName}</span>
          <span className="ah-scholarship-type">{row.scholarshipType}</span>
        </div>
      ),
    },
    { key: "gradeAverage", header: "Grade Avg.", sortable: true },
    {
      key: "submittedAt",
      header: "Submitted",
      accessor: (row) => row.submittedAt,
      sortable: true,
      render: (row) => formatDate(row.submittedAt),
    },
    {
      key: "waiting",
      header: "Awaiting Decision",
      accessor: (row) => row.submittedAt,
      sortable: true,
      render: (row) => <span className="ah-waiting-pill">{daysWaiting(row.submittedAt)}</span>,
    },
  ];

  return (
    <AppLayout title="Decision Queue">
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
            <div className="ah-queue-header">
              <h2>Ready for Final Decision</h2>
              <p className="dashboard-meta">
                {queue.length === 0
                  ? "Nothing is waiting on your approval right now."
                  : `${queue.length} scholarship application${
                      queue.length === 1 ? "" : "s"
                    } have completed screening and evaluation - review each before confirming Approved or Rejected.`}
              </p>
            </div>
            <DataTable
              columns={columns}
              rows={queue}
              getRowKey={(row) => row.applicationId}
              emptyMessage="No scholarship applications are waiting on a final decision."
              onRowClick={(row) => navigate(`/academic-head/scholarship-applications/${row.applicationId}`)}
            />
          </Card>

          {oversight && (
            <Card className="ah-oversight-card">
              <h3>Admissions Context</h3>
              <p className="dashboard-meta">
                Read-only, from Admin-Registrar's admissions pipeline - for context only, not something you manage
                here.
              </p>
              <dl className="ah-oversight-figures">
                <div>
                  <dt>Applications</dt>
                  <dd>{oversight.totalApplications}</dd>
                </div>
                <div>
                  <dt>Applicants</dt>
                  <dd>{oversight.totalApplicants}</dd>
                </div>
                <div>
                  <dt>Pending</dt>
                  <dd>{oversight.pendingCount}</dd>
                </div>
                <div>
                  <dt>Approved</dt>
                  <dd>{oversight.approvedCount}</dd>
                </div>
                <div>
                  <dt>Rejected</dt>
                  <dd>{oversight.rejectedCount}</dd>
                </div>
              </dl>
            </Card>
          )}
        </>
      )}
    </AppLayout>
  );
}
