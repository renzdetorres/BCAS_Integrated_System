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
import TrackerStatus from "../components/TrackerStatus.jsx";
import "./ApplicantDashboardPage.css";

const DEADLINE_TYPE_LABELS = {
  ScholarshipDeadline: "Scholarship Deadline",
  DocumentDeadline: "Document Deadline",
  EnrollmentPeriod: "Enrollment Period",
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
      <AppLayout title={`${session.firstName}'s Application`}>
        <Card>
          <p>Loading...</p>
        </Card>
      </AppLayout>
    );
  }

  if (errorMessage) {
    return (
      <AppLayout title={`${session.firstName}'s Application`}>
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
  // SF10 is only asked for after the exam, and an uploaded document is waiting on staff, not on the applicant.
  const missingDocs = requirements.filter((r) => r.status === "NotSubmitted" && r.documentType !== "SF10");
  const needsAttentionDocs = requirements.some((r) => r.status === "Flagged" || r.status === "Rejected");

  // A single, prioritized "what do I do next" call to action - the thing an
  // applicant actually opens this dashboard to find out.
  let nextAction = null;
  if (!admission) {
    nextAction = { text: "Submit your admission application to get started.", to: "/applications", cta: "Apply Now" };
  } else if (needsAttentionDocs || missingDocs.length > 0) {
    nextAction = {
      text: needsAttentionDocs
        ? "One or more documents need your attention before they can be verified."
        : `You still have ${missingDocs.length} document${missingDocs.length === 1 ? "" : "s"} to submit.`,
      to: "/documents",
      cta: "Manage Documents",
    };
  } else if (admission.nextActionPath === "/payment") {
    nextAction = { text: admission.nextAction, to: "/payment", cta: "Go to Payment" };
  } else if (!examSelection && admission.nextActionPath === "/exam-schedule") {
    nextAction = {
      text: admission.nextAction,
      to: "/exam-schedule",
      cta: "Select Schedule",
    };
  }

  return (
    <AppLayout title={`${session.firstName}'s Application`}>
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
                <WorkflowStepper steps={admission.steps} labels={ADMISSION_STEP_LABELS} numbered />
                <TrackerStatus steps={admission.steps} subProcess={admission.subProcess} nextAction={admission.nextAction} nextActionPath={admission.nextActionPath} />

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
                    <WorkflowStepper steps={scholarship.steps} labels={SCHOLARSHIP_STEP_LABELS} numbered />
                    <TrackerStatus
                      steps={scholarship.steps}
                      labels={SCHOLARSHIP_STEP_LABELS}
                      subProcess={scholarship.subProcess}
                      nextAction={scholarship.nextAction}
                      nextActionPath={scholarship.nextActionPath}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="applicant-dashboard-aside">
          <Card className="ui-card-flat">
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

          <Card className="ui-card-flat">
            <div className="applicant-announcements-header">
              <h2>Announcements</h2>
              <Link to="/announcements" className="target-link">
                View all
              </Link>
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
