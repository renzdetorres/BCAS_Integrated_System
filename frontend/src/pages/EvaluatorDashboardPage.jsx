import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEvaluatorDashboard } from "../api/evaluatorDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import Icon from "../components/ui/Icon.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./EvaluatorDashboardPage.css";

// An application that has waited this long is shown as late. This is a display threshold chosen here,
// not a school policy: change it in one place if the school sets a screening deadline.
const LATE_AFTER_DAYS = 14;

const STAGE_LABELS = {
  Submitted: "Submitted",
  EligibilityScreening: "In eligibility screening",
};

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysSince(isoDateTime) {
  const ms = Date.now() - new Date(isoDateTime).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function plural(count, one, many = `${one}s`) {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

function formatGrade(value) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

/** How long an application has been waiting, with the late ones standing out by tone and wording. */
function WaitingCell({ days }) {
  const late = days >= LATE_AFTER_DAYS;
  return (
    <span className={`evaluator-wait${late ? " evaluator-wait-late" : ""}`}>
      {days === 0 ? "Today" : plural(days, "day")}
      {late ? <span className="evaluator-wait-flag">Late</span> : null}
    </span>
  );
}

export default function EvaluatorDashboardPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  // The Admin works the same queue from its own routes.
  const basePath = session.role === "Admin" ? "/admin" : "/evaluator";
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [stageFilter, setStageFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    getEvaluatorDashboard()
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the screening queue.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const queue = useMemo(() => dashboard?.queue ?? [], [dashboard]);
  const counts = useMemo(
    () => ({
      all: queue.length,
      Submitted: queue.filter((row) => row.status === "Submitted").length,
      EligibilityScreening: queue.filter((row) => row.status === "EligibilityScreening").length,
      late: queue.filter((row) => daysSince(row.submittedAt) >= LATE_AFTER_DAYS).length,
    }),
    [queue]
  );

  const rows = useMemo(() => {
    if (stageFilter === "late") return queue.filter((row) => daysSince(row.submittedAt) >= LATE_AFTER_DAYS);
    if (stageFilter === "all") return queue;
    return queue.filter((row) => row.status === stageFilter);
  }, [queue, stageFilter]);

  const reviewPath = (row) => `${basePath}/scholarship-applications/${row.applicationId}`;
  // The API lists the queue oldest first, so the first row of what is on screen is the one to open next.
  const oldest = rows[0];

  const toggle = (key) => setStageFilter((current) => (current === key ? "all" : key));

  const summary = [
    { label: "Awaiting screening", value: counts.all, onClick: () => setStageFilter("all"), active: stageFilter === "all" },
    { label: STAGE_LABELS.Submitted, value: counts.Submitted, onClick: () => toggle("Submitted"), active: stageFilter === "Submitted" },
    {
      label: STAGE_LABELS.EligibilityScreening,
      value: counts.EligibilityScreening,
      onClick: () => toggle("EligibilityScreening"),
      active: stageFilter === "EligibilityScreening",
    },
    {
      label: `Waiting ${LATE_AFTER_DAYS}+ days`,
      value: counts.late,
      tone: "amber",
      onClick: () => toggle("late"),
      active: stageFilter === "late",
    },
  ];

  const columns = [
    {
      key: "applicantName",
      header: "Applicant",
      sortable: true,
      render: (row) => <PersonCell name={row.applicantName} detail={`Submitted ${formatDate(row.submittedAt)}`} />,
    },
    {
      key: "scholarship",
      header: "Scholarship",
      accessor: (row) => `${row.scholarshipName} ${row.scholarshipType}`,
      sortable: true,
      render: (row) => <PersonCell name={row.scholarshipName} detail={row.scholarshipType} />,
    },
    {
      key: "gradeAverage",
      header: "Grade avg.",
      accessor: (row) => row.gradeAverage ?? 0,
      sortable: true,
      align: "right",
      render: (row) => <span className="evaluator-number">{formatGrade(row.gradeAverage)}</span>,
    },
    {
      key: "status",
      header: "Stage",
      accessor: (row) => row.status,
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "waiting",
      header: "Waiting",
      accessor: (row) => daysSince(row.submittedAt),
      sortable: true,
      render: (row) => <WaitingCell days={daysSince(row.submittedAt)} />,
    },
    {
      key: "action",
      header: "",
      searchable: false,
      render: (row) => <RowAction label="Review" icon="chevron-right" ariaLabel={`Review ${row.applicantName}'s application`} onClick={() => navigate(reviewPath(row))} />,
    },
  ];

  const pending = dashboard?.pendingEvaluationsCount ?? 0;
  const subtitle =
    pending === 0
      ? "Nothing is waiting on you right now."
      : `${plural(pending, "scholarship application")} waiting, oldest first.`;

  return (
    <AppLayout title="Scholarship Screening">
      <DataTable
        title="Awaiting screening"
        subtitle={subtitle}
        titleAs="h2"
        summary={summary}
        actions={
          oldest ? (
            <button type="button" className="btn btn-primary" onClick={() => navigate(reviewPath(oldest))}>
              Review oldest
              <Icon name="chevron-right" size={16} />
            </button>
          ) : null
        }
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.applicationId}
        searchPlaceholder="Search by applicant or scholarship"
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage={stageFilter === "all" ? "No scholarship applications are waiting for screening." : "Nothing matches this filter."}
        onRowClick={(row) => navigate(reviewPath(row))}
      />

      {dashboard && (
        <Card className="evaluator-recent-card">
          <h2 className="evaluator-recent-title">Recently decided</h2>
          {dashboard.recentlyEvaluated.length === 0 ? (
            <p className="dashboard-meta">No scholarship applications have been decided yet.</p>
          ) : (
            <ul className="evaluator-recent-list">
              {dashboard.recentlyEvaluated.map((application) => (
                <li key={application.applicationId}>
                  <button type="button" className="evaluator-recent-row" onClick={() => navigate(reviewPath(application))}>
                    <span className="evaluator-recent-name">{application.applicantName}</span>
                    <span className="evaluator-recent-scholarship">{application.scholarshipName}</span>
                    <StatusBadge status={application.status} />
                    <Icon name="chevron-right" size={15} className="evaluator-recent-chevron" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </AppLayout>
  );
}
