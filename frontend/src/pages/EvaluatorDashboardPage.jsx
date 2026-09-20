import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEvaluatorDashboard } from "../api/evaluatorDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./EvaluatorDashboardPage.css";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function EvaluatorDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getEvaluatorDashboard()
      .then((data) => {
        if (!cancelled) setDashboard(data);
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

  const queueColumns = [
    { key: "applicantName", header: "Applicant", sortable: true },
    {
      key: "scholarship",
      header: "Scholarship",
      accessor: (row) => row.scholarshipName,
      sortable: true,
      render: (row) => (
        <div className="evaluator-scholarship-cell">
          <span>{row.scholarshipName}</span>
          <span className="evaluator-scholarship-type">{row.scholarshipType}</span>
        </div>
      ),
    },
    { key: "gradeAverage", header: "Grade Avg.", sortable: true },
    {
      key: "status",
      header: "Stage",
      accessor: (row) => row.status,
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "submittedAt",
      header: "Submitted",
      accessor: (row) => row.submittedAt,
      sortable: true,
      render: (row) => formatDate(row.submittedAt),
    },
  ];

  return (
    <AppLayout title="Screening Queue">
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

      {!isLoading && !errorMessage && dashboard && (
        <>
          <Card>
            <div className="evaluator-queue-header">
              <div>
                <h2>Awaiting Screening</h2>
                <p className="dashboard-meta">
                  {dashboard.pendingEvaluationsCount === 0
                    ? "Nothing waiting on you right now."
                    : `${dashboard.pendingEvaluationsCount} scholarship application${
                        dashboard.pendingEvaluationsCount === 1 ? "" : "s"
                      } waiting, oldest first.`}
                </p>
              </div>
            </div>
            <DataTable
              columns={queueColumns}
              rows={dashboard.queue}
              getRowKey={(row) => row.applicationId}
              emptyMessage="No scholarship applications awaiting evaluation."
              onRowClick={(row) => navigate(`/evaluator/scholarship-applications/${row.applicationId}`)}
            />
          </Card>

          <Card className="evaluator-recent-card">
            <h2>Recently Evaluated</h2>
            {dashboard.recentlyEvaluated.length === 0 ? (
              <p className="dashboard-meta">No scholarship applications evaluated yet.</p>
            ) : (
              <ul className="evaluator-recent-list">
                {dashboard.recentlyEvaluated.map((application) => (
                  <li key={application.applicationId}>
                    <button
                      type="button"
                      className="evaluator-recent-row"
                      onClick={() => navigate(`/evaluator/scholarship-applications/${application.applicationId}`)}
                    >
                      <span className="evaluator-recent-name">{application.applicantName}</span>
                      <span className="evaluator-recent-scholarship">{application.scholarshipName}</span>
                      <StatusBadge status={application.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </AppLayout>
  );
}
