import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyApplicationTracking } from "../api/applicationTrackingApi.js";
import { getUpcomingDeadlines } from "../api/dashboardApi.js";
import { getActiveAnnouncements } from "../api/announcementApi.js";
import { getMyExamScheduleSelection } from "../api/examScheduleApi.js";
import { DOCUMENT_TYPE_LABELS } from "../api/documentApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import NextActionBanner from "../components/ui/NextActionBanner.jsx";
import WorkflowStepper, { ADMISSION_STEP_LABELS, SCHOLARSHIP_STEP_LABELS } from "../components/WorkflowStepper.jsx";
import "./ApplicantDashboardPage.css";

const DEADLINE_TYPE_LABELS = {
  ScholarshipDeadline: "Scholarship Deadline",
  DocumentDeadline: "Document Deadline",
  EnrollmentPeriod: "Enrollment Period",
};

const ADMISSION_NEXT_STEP_HINT = {
  Submitted: "Your application has been received. Upload your requirements so verification can begin.",
  DocumentsReceived: "Your documents are being processed by the registrar.",
  UnderReview: "The registrar is reviewing your application.",
  ExamScheduled: "Your entrance exam is scheduled - check your exam permit for the venue and time.",
  ExamCompleted: "Your exam is complete. Awaiting the registrar's decision.",
  DecisionReleased: "A decision has been released for your application.",
};

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ApplicantDashboardPage() {
  const { session } = useSession();
  const [tracking, setTracking] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [examSelection, setExamSelection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getMyApplicationTracking(),
      getUpcomingDeadlines(),
      getActiveAnnouncements(),
      getMyExamScheduleSelection(),
    ])
      .then(([trackingData, deadlineData, announcementData, examData]) => {
        if (cancelled) return;
        setTracking(trackingData);
        setDeadlines(deadlineData);
        setAnnouncements(announcementData);
        setExamSelection(examData);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load your dashboard.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <AppLayout title={`Welcome back, ${session.firstName}!`}>
        <Card>
          <p>Loading...</p>
        </Card>
      </AppLayout>
    );
  }

  if (errorMessage) {
    return (
      <AppLayout title={`Welcome back, ${session.firstName}!`}>
        <Card>
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        </Card>
      </AppLayout>
    );
  }

  const admission = tracking.admissionApplications[0] ?? null;
  const scholarships = tracking.scholarshipApplications;
  const requirements = tracking.documents?.requirements ?? [];
  const verifiedCount = requirements.filter((r) => r.status === "Verified").length;
  const outstandingDocs = requirements.filter((r) => r.status !== "Verified");

  // A single, prioritized "what do I do next" call to action - the thing an
  // applicant actually opens this dashboard to find out.
  let nextAction = null;
  if (!admission) {
    nextAction = { text: "Submit your admission application to get started.", to: "/applications", cta: "Apply Now" };
  } else if (outstandingDocs.length > 0) {
    const flagged = outstandingDocs.some((d) => d.status === "Flagged" || d.status === "Rejected");
    nextAction = {
      text: flagged
        ? "One or more documents need your attention before they can be verified."
        : `You still have ${outstandingDocs.length} document${outstandingDocs.length === 1 ? "" : "s"} to submit.`,
      to: "/documents",
      cta: "Manage Documents",
    };
  } else if (!examSelection) {
    nextAction = {
      text: "All documents are verified. Select your entrance exam schedule next.",
      to: "/exam-schedule",
      cta: "Select Schedule",
    };
  }

  return (
    <AppLayout title={`Welcome back, ${session.firstName}!`}>
      {nextAction && <NextActionBanner {...nextAction} />}

      <div className="applicant-dashboard-grid">
        <div className="applicant-dashboard-main">
          <Card>
            <h2>Admission Application</h2>
            {!admission ? (
              <p className="dashboard-meta">
                You haven&apos;t submitted an admission application yet.{" "}
                <Link to="/applications">Start one now</Link>.
              </p>
            ) : (
              <>
                <div className="applicant-app-summary">
                  <span className="applicant-app-course">{admission.courseAppliedFor}</span>
                  <StatusBadge status={admission.status} />
                </div>
                <WorkflowStepper steps={admission.steps} labels={ADMISSION_STEP_LABELS} />
                {(() => {
                  const current = admission.steps.find((s) => s.isCurrent);
                  const hint = current && ADMISSION_NEXT_STEP_HINT[current.step];
                  return hint ? <p className="dashboard-meta applicant-step-hint">{hint}</p> : null;
                })()}

                <div className="applicant-requirements">
                  <ProgressBar
                    value={verifiedCount}
                    max={requirements.length}
                    label={`Requirements verified (${verifiedCount}/${requirements.length})`}
                  />
                  {outstandingDocs.length > 0 && (
                    <ul className="applicant-outstanding-list">
                      {outstandingDocs.map((doc) => {
                        const needsAttention = doc.status === "Flagged" || doc.status === "Rejected";
                        return (
                          <li
                            key={doc.documentType}
                            className={needsAttention ? "applicant-outstanding-flagged" : undefined}
                          >
                            <span>{DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}</span>
                            <StatusBadge status={doc.status === "NotSubmitted" ? "NotUploaded" : doc.status} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </Card>

          <Card>
            <h2>Scholarship Application</h2>
            {scholarships.length === 0 ? (
              <p className="dashboard-meta">
                No scholarship application yet. <Link to="/scholarships">Browse scholarships</Link>.
              </p>
            ) : (
              <ul className="applicant-scholarship-list">
                {scholarships.map((scholarship) => (
                  <li key={scholarship.applicationId}>
                    <div className="applicant-app-summary">
                      <span className="applicant-app-course">{scholarship.scholarshipName}</span>
                      <StatusBadge status={scholarship.status} />
                    </div>
                    <WorkflowStepper steps={scholarship.steps} labels={SCHOLARSHIP_STEP_LABELS} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="applicant-dashboard-aside">
          <Card>
            <h2>Upcoming Deadlines</h2>
            {deadlines.length === 0 ? (
              <p className="dashboard-meta">No upcoming deadlines.</p>
            ) : (
              <ul className="deadline-list">
                {deadlines.map((deadline) => (
                  <li key={`${deadline.type}-${deadline.date}`}>
                    <span className="deadline-type">{DEADLINE_TYPE_LABELS[deadline.type] ?? deadline.type}</span>
                    <span className="deadline-title">{deadline.title}</span>
                    <span className="deadline-date">{formatDate(deadline.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="applicant-announcements-header">
              <h2>Announcements</h2>
              <Link to="/announcements">View all</Link>
            </div>
            {announcements.length === 0 ? (
              <p className="dashboard-meta">No active announcements right now.</p>
            ) : (
              <ul className="applicant-announcement-list">
                {announcements.slice(0, 3).map((announcement) => (
                  <li key={announcement.announcementId}>
                    <span className="applicant-announcement-title">{announcement.title}</span>
                    <p className="applicant-announcement-body">{announcement.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
