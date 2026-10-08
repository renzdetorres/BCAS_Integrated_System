import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getAdminDashboard } from "../api/adminDashboardApi.js";
import { getEnrollmentSummary } from "../api/adminReportsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Icon from "../components/ui/Icon.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { DEPARTMENT_OPTIONS } from "../config/departments.js";
import { useSession } from "../context/SessionContext.jsx";
import "./AdminDashboardPage.css";

const WORKSPACES = [
  { value: "admission", label: "Admission", icon: "graduation-cap" },
  { value: "scholarship", label: "Scholarship", icon: "award" },
];

const SHORTCUTS = [
  { to: "/admin/announcements", label: "Post an announcement", icon: "megaphone" },
  { to: "/admin/exam-schedules", label: "Exam schedules", icon: "calendar" },
  { to: "/admin/staff", label: "Add a staff account", icon: "user-plus" },
  { to: "/admin/reports", label: "Reports", icon: "chart" },
];

/** Philippine school years start in June, so Jan-May still belongs to the year that began last June. */
function currentAcademicYear(now = new Date()) {
  const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function plural(count, one, many) {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

function applicationsLink(params) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  const search = query.toString();
  return search ? `/admin/applications?${search}` : "/admin/applications";
}

/** The same figures for either workspace, so the page renders one shape. */
function workspaceView(dashboard, workspace) {
  if (workspace === "scholarship") {
    return { ...dashboard.scholarship, category: "Scholarship", pendingDocumentsCount: dashboard.pendingDocumentsCount };
  }
  return { ...dashboard, category: "Admission" };
}

function WorkspaceSwitch({ value, onChange }) {
  const activeIndex = WORKSPACES.findIndex((w) => w.value === value);
  return (
    <div className="dash-switch" role="group" aria-label="Dashboard workspace" style={{ "--switch-index": activeIndex }}>
      <span className="dash-switch-thumb" aria-hidden="true" />
      {WORKSPACES.map((workspace) => (
        <button
          key={workspace.value}
          type="button"
          aria-pressed={workspace.value === value}
          className={workspace.value === value ? "dash-switch-option dash-switch-option-active" : "dash-switch-option"}
          onClick={() => onChange(workspace.value)}
        >
          <Icon name={workspace.icon} size={15} />
          {workspace.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The page's opening line: what needs doing, in words, before any figure.
 * Counts are part of the sentence so the headline and the data can't drift.
 */
function Briefing({ view, workspaceLabel }) {
  const noun = workspaceLabel.toLowerCase();
  if (view.totalApplications === 0) {
    return <>No {noun} applications have come in yet this year.</>;
  }
  const followUps = [];
  if (view.unassignedCount > 0) followUps.push(`${plural(view.unassignedCount, "still needs", "still need")} a department`);
  if (view.pendingDocumentsCount > 0) followUps.push(`${plural(view.pendingDocumentsCount, "document", "documents")} to verify`);

  return (
    <>
      {view.pendingCount > 0 ? (
        <>
          <em>{plural(view.pendingCount, `${noun} application is`, `${noun} applications are`)}</em> waiting on a
          decision
        </>
      ) : (
        <>Every {noun} application has a decision</>
      )}
      {followUps.length > 0 ? <>, and {followUps.join(" and ")}.</> : "."}
    </>
  );
}

/** Approved / pending / rejected as one proportional strip: the decision mix at a glance. */
function DecisionMix({ view }) {
  const segments = [
    { key: "approved", label: "Approved", value: view.approvedCount },
    { key: "pending", label: "Awaiting decision", value: view.pendingCount },
    { key: "rejected", label: "Rejected", value: view.rejectedCount },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  return (
    <figure className="dash-mix">
      <div className="dash-mix-head">
        <span className="dash-mix-title">Decisions so far</span>
        <span className="dash-mix-total">{total.toLocaleString()} applications</span>
      </div>
      <div className="dash-mix-bar" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.key}
              className={`dash-mix-segment dash-mix-${s.key}`}
              style={{ flexGrow: s.value }}
              title={`${s.label}: ${s.value.toLocaleString()} (${Math.round((s.value / total) * 100)}%)`}
            />
          ))}
      </div>
      <figcaption className="dash-mix-legend">
        {segments.map((s) => (
          <span key={s.key} className="dash-mix-item">
            <span className={`dash-mix-swatch dash-mix-${s.key}`} aria-hidden="true" />
            {s.label}
            <strong>{s.value.toLocaleString()}</strong>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/**
 * The four shortcuts live behind one floating button: open on hover or
 * focus (desktop), on tap (touch), closed with Escape or by leaving.
 */
function ShortcutFab() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div
      className={`dash-fab${open ? " dash-fab-open" : ""}`}
      ref={rootRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <nav className="dash-fab-menu" aria-label="Shortcuts" hidden={!open}>
        <ul>
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.to}>
              <Link to={shortcut.to} className="dash-shortcut" onClick={() => setOpen(false)}>
                <Icon name={shortcut.icon} size={17} />
                {shortcut.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <button
        type="button"
        className="dash-fab-button"
        aria-label="Shortcuts"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? "x" : "plus"} size={22} />
      </button>
    </div>
  );
}

/** Enrolled = Approved and reserved. Reuses the Enrollment Summary report so the two never disagree. */
function EnrollmentSummary({ summary, approvedCount }) {
  const programs = summary.byProgram ?? [];
  const awaitingReservation = Math.max(0, approvedCount - summary.totalEnrolled);
  return (
    <section className="dash-panel dash-enrollment" aria-labelledby="dash-enrollment-title">
      <div className="dash-panel-head">
        <h2 id="dash-enrollment-title" className="dash-panel-title">
          Summary of enrollment
        </h2>
        <Link to="/admin/reports" className="dash-link">
          Full report
          <Icon name="chevron-right" size={14} />
        </Link>
      </div>
      <dl className="dash-enroll-figures">
        <div>
          <dt>Enrolled</dt>
          <dd>{summary.totalEnrolled.toLocaleString()}</dd>
          <p className="dash-figure-note">Approved and reserved</p>
        </div>
        <div>
          <dt>Approved, not reserved</dt>
          <dd>{awaitingReservation.toLocaleString()}</dd>
          <p className="dash-figure-note">
            <Link to="/admin/reservations">Open reservations</Link>
          </p>
        </div>
      </dl>
      {programs.length > 0 ? (
        <ul className="dash-enroll-list">
          {programs.map((p) => (
            <li key={p.program}>
              <span>{p.program}</span>
              <strong>{p.count.toLocaleString()}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dash-empty">No enrolled applicants yet.</p>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dash-layout" aria-busy="true" aria-label="Loading dashboard">
      <div className="dash-skeleton dash-skeleton-ledger" />
      <div className="dash-skeleton dash-skeleton-rail" />
      <div className="dash-skeleton dash-skeleton-departments" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const workspace = searchParams.get("workspace") === "scholarship" ? "scholarship" : "admission";

  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [enrollment, setEnrollment] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getEnrollmentSummary()
      .then((data) => {
        if (!cancelled) setEnrollment(data);
      })
      .catch(() => {});

    getAdminDashboard()
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

  function setWorkspace(next) {
    setSearchParams(next === "admission" ? {} : { workspace: next }, { replace: true });
  }

  const view = dashboard ? workspaceView(dashboard, workspace) : null;
  const workspaceLabel = workspace === "scholarship" ? "Scholarship" : "Admission";

  const countByDepartment = new Map((view?.byDepartment ?? []).map((d) => [d.department ?? "Unassigned", d.count]));
  const departments = [
    ...DEPARTMENT_OPTIONS.map((department) => ({ department, count: countByDepartment.get(department) ?? 0 })),
    ...(view?.unassignedCount > 0 ? [{ department: "Unassigned", count: view.unassignedCount, unassigned: true }] : []),
  ];
  const largestDepartment = Math.max(1, ...departments.map((d) => d.count));


  const attention = view
    ? [
        {
          count: view.pendingCount,
          label: workspace === "scholarship" ? "In screening" : "Awaiting a decision",
          detail: "Submitted and not yet approved or rejected",
          tone: "amber",
          to: applicationsLink({ category: view.category }),
        },
        {
          count: view.pendingDocumentsCount,
          label: "Documents to verify",
          detail: "Uploaded by applicants, not yet reviewed",
          tone: "amber",
          to: "/admin/documents",
        },
        {
          count: view.unassignedCount,
          label: "Without a department",
          detail: "No Academic Head can see these yet",
          tone: "red",
          to: applicationsLink({ category: view.category, department: "Unassigned" }),
        },
      ]
    : [];

  return (
    <AppLayout topbarLeading={<WorkspaceSwitch value={workspace} onChange={setWorkspace} />}>
      <header className="dash-intro">
        <div className="dash-intro-text">
          <h1 className="dash-title">{workspaceLabel}</h1>
          <p className="dash-intro-meta">
            {greeting()}, {session.firstName} &middot; Academic Year {currentAcademicYear()}
          </p>
          <p className="dash-intro-title">
            {view ? <Briefing view={view} workspaceLabel={workspaceLabel} /> : `${workspaceLabel} overview`}
          </p>
        </div>
        <Link to={applicationsLink({ category: workspaceLabel })} className="btn btn-primary dash-intro-cta">
          Open the queue
          <Icon name="chevron-right" size={16} />
        </Link>
      </header>

      {isLoading && <DashboardSkeleton />}

      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && view && (
        <div className={`dash-layout dash-layout-${workspace}`} key={workspace}>
          <section className="dash-panel dash-ledger" aria-label={`${workspaceLabel} figures`}>
            <dl className="dash-figures">
              <div>
                <dt>Awaiting decision</dt>
                <dd>{view.pendingCount.toLocaleString()}</dd>
                <p className="dash-figure-note">
                  {view.totalApplications > 0 ? `of ${plural(view.totalApplications, "application", "applications")}` : "Nothing yet"}
                </p>
              </div>
              <div>
                <dt>New this week</dt>
                <dd>{view.submittedThisWeek.toLocaleString()}</dd>
                <p className={view.submittedThisWeek > 0 ? "dash-figure-note dash-figure-note-up" : "dash-figure-note"}>
                  {view.submittedThisWeek > 0 ? (
                    <>
                      <Icon name="trend-up" size={13} />
                      Submitted in the last 7 days
                    </>
                  ) : (
                    "None new this week"
                  )}
                </p>
              </div>
            </dl>
            <DecisionMix view={view} />
          </section>

          <aside className="dash-panel dash-attention" aria-labelledby="dash-attention-title">
            <h2 id="dash-attention-title" className="dash-panel-title">
              Needs attention
            </h2>
            <ul>
              {attention.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className={`dash-task${item.count === 0 ? " dash-task-clear" : ""}`}>
                    <span className={`dash-task-count dash-task-count-${item.count === 0 ? "clear" : item.tone}`}>
                      {item.count === 0 ? <Icon name="check" size={18} /> : item.count.toLocaleString()}
                    </span>
                    <span className="dash-task-text">
                      <span className="dash-task-label">{item.label}</span>
                      <span className="dash-task-detail">{item.count === 0 ? "All clear" : item.detail}</span>
                    </span>
                    <Icon name="chevron-right" size={16} className="dash-task-chevron" />
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          {workspace === "admission" && enrollment ? (
            <EnrollmentSummary summary={enrollment} approvedCount={view.approvedCount} />
          ) : null}

          <section className="dash-panel dash-departments" aria-labelledby="dash-departments-title">
            <div className="dash-panel-head">
              <h2 id="dash-departments-title" className="dash-panel-title">
                By department
              </h2>
              <span className="dash-panel-aside">% of {view.totalApplications.toLocaleString()}</span>
            </div>
            <ol className="dash-dept-list">
              {departments.map((d, index) => {
                const share = view.totalApplications > 0 ? Math.round((d.count / view.totalApplications) * 100) : 0;
                return (
                  <li key={d.department}>
                    <Link
                      to={applicationsLink({ category: view.category, department: d.department })}
                      className={`dash-dept${d.unassigned ? " dash-dept-unassigned" : ""}`}
                    >
                      <span className="dash-dept-name">{d.department}</span>
                      <span className="dash-dept-track" aria-hidden="true">
                        <span
                          className="dash-dept-bar"
                          style={{ "--bar-scale": d.count / largestDepartment, "--bar-index": index }}
                        />
                      </span>
                      <span className="dash-dept-count">{d.count.toLocaleString()}</span>
                      <span className="dash-dept-share">{share}%</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="dash-panel dash-recent" aria-labelledby="dash-recent-title">
            <div className="dash-panel-head">
              <h2 id="dash-recent-title" className="dash-panel-title">
                Latest applications
              </h2>
              <Link to={applicationsLink({ category: view.category })} className="dash-link">
                View all
                <Icon name="chevron-right" size={14} />
              </Link>
            </div>
            {view.recentApplications.length === 0 ? (
              <p className="dash-empty">No {workspaceLabel.toLowerCase()} applications submitted yet.</p>
            ) : (
              <div className="dash-table-scroll">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th scope="col">Applicant</th>
                      <th scope="col">Department</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="dash-table-date">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.recentApplications.slice(0, 5).map((application) => (
                      <tr
                        key={application.applicationId}
                        tabIndex={0}
                        onClick={() => navigate(`/admin/applications/${application.applicationId}`)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") navigate(`/admin/applications/${application.applicationId}`);
                        }}
                      >
                        <td>
                          <span className="dash-table-name">{application.applicantName}</span>
                          {workspace === "scholarship" && application.scholarshipName ? (
                            <span className="dash-table-sub">{application.scholarshipName}</span>
                          ) : null}
                        </td>
                        <td>{application.department ?? <span className="dash-unassigned-text">Unassigned</span>}</td>
                        <td>
                          <StatusBadge status={application.status} adminContext />
                        </td>
                        <td className="dash-table-date">
                          <span className="dash-date-full">{formatDate(application.submittedAt)}</span>
                          <span className="dash-date-short">{formatShortDate(application.submittedAt)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      )}

      <ShortcutFab />
    </AppLayout>
  );
}
