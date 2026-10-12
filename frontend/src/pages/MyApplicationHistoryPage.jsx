import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyApplicationHistory } from "../api/applicationHistoryApi.js";
import { APPLICATION_TYPES } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import Icon from "../components/ui/Icon.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./MyApplicationHistoryPage.css";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function admissionTypeLabel(applicationType) {
  return APPLICATION_TYPES.find((t) => t.value === applicationType)?.label ?? applicationType;
}

function applicationTitle(application) {
  return application.category === "Admission" ? application.courseAppliedFor : application.scholarshipName;
}

export default function MyApplicationHistoryPage() {
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getMyApplicationHistory()
      .then((data) => {
        if (cancelled) return;
        setApplications(data);
        if (data.length > 0) setSelectedId(data[0].applicationId);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load application history.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedApplication = applications.find((a) => a.applicationId === selectedId) ?? null;

  return (
    <AppLayout
      title="Application History"
      actions={
        <div className="history-actions">
          <Link className="history-action history-action-admission" to="/applications">
            <span className="history-action-icon" aria-hidden="true">
              <Icon name="doc" size={16} />
            </span>
            <span className="history-action-text">
              <span className="history-action-label">Admission</span>
              <span className="history-action-hint">Start an application</span>
            </span>
            <Icon name="chevron-right" size={16} className="history-action-arrow" />
          </Link>
          <Link className="history-action history-action-scholarship" to="/scholarships">
            <span className="history-action-icon" aria-hidden="true">
              <Icon name="award" size={16} />
            </span>
            <span className="history-action-text">
              <span className="history-action-label">Scholarship</span>
              <span className="history-action-hint">Apply for aid</span>
            </span>
            <Icon name="chevron-right" size={16} className="history-action-arrow" />
          </Link>
        </div>
      }
    >
      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}

      {isLoading && <p>Loading...</p>}

      {!isLoading && !errorMessage && applications.length === 0 && (
        <Card>
          <p>No applications submitted yet.</p>
        </Card>
      )}

      {!isLoading && applications.length > 0 && (
        <div className="history-layout">
          <Card className="history-list-card">
            <h2>All Applications</h2>
            <ul className="history-list">
              {applications.map((application) => (
                <li key={application.applicationId}>
                  <button
                    type="button"
                    className={`history-list-item${
                      application.applicationId === selectedId ? " history-list-item-selected" : ""
                    }`}
                    onClick={() => setSelectedId(application.applicationId)}
                  >
                    <div className="history-list-header">
                      <span className={`history-category category-${application.category.toLowerCase()}`}>
                        {application.category}
                      </span>
                      <StatusBadge status={application.status} />
                    </div>
                    <p className="history-title">{applicationTitle(application)}</p>
                    <p className="history-meta">Submitted {formatDate(application.submittedAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="history-detail-card">
            <h2>Application Details</h2>
            {!selectedApplication && <p>Select an application to see its details.</p>}
            {selectedApplication && (
              <div className="history-detail">
                <Link
                  className="btn btn-primary btn-sm history-receipt-link"
                  to={`/applications/receipt/${selectedApplication.applicationId}`}
                >
                  View / Print Receipt
                </Link>

                <div className="history-detail-row">
                  <span className="history-detail-label">Category</span>
                  <span>{selectedApplication.category}</span>
                </div>
                <div className="history-detail-row">
                  <span className="history-detail-label">Status</span>
                  <StatusBadge status={selectedApplication.status} />
                </div>
                <div className="history-detail-row">
                  <span className="history-detail-label">Submitted</span>
                  <span>{formatDate(selectedApplication.submittedAt)}</span>
                </div>

                {selectedApplication.category === "Admission" && (
                  <>
                    <div className="history-detail-row">
                      <span className="history-detail-label">Application type</span>
                      <span>{admissionTypeLabel(selectedApplication.applicationType)}</span>
                    </div>
                    <div className="history-detail-row">
                      <span className="history-detail-label">Course applied for</span>
                      <span>{selectedApplication.courseAppliedFor}</span>
                    </div>
                    <div className="history-detail-row">
                      <span className="history-detail-label">Previous school</span>
                      <span>{selectedApplication.previousSchool}</span>
                    </div>
                  </>
                )}

                {selectedApplication.category === "Scholarship" && (
                  <>
                    <div className="history-detail-row">
                      <span className="history-detail-label">Scholarship</span>
                      <span>{selectedApplication.scholarshipName}</span>
                    </div>
                    <div className="history-detail-row">
                      <span className="history-detail-label">Scholarship type</span>
                      <span>{selectedApplication.scholarshipType}</span>
                    </div>
                    <div className="history-detail-row">
                      <span className="history-detail-label">Grade average</span>
                      <span>{selectedApplication.gradeAverage}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
