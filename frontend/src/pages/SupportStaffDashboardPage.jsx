import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSupportStaffDashboard } from "../api/supportStaffDashboardApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Icon from "../components/ui/Icon.jsx";
// The Support Staff dashboard is laid out exactly like the Admin and Evaluator ones, so it shares their styles.
import "./AdminDashboardPage.css";

// Where Support Staff do their work, in the order an applicant moves through it.
const WORK_AREAS = [
  { to: "/support-staff/payments", label: "Payment Verification", detail: "Check each proof of payment" },
  { to: "/support-staff/exam-permits", label: "Exam Permits", detail: "Release permits to verified applicants" },
  { to: "/support-staff/exam-results", label: "Exam Results", detail: "Release the scores the Evaluator recorded" },
  { to: "/support-staff/interviews", label: "Interviews & Results", detail: "Schedule interviews and release decisions" },
  { to: "/support-staff/applicants", label: "Applicant Records", detail: "Search every applicant" },
];

function plural(count, one, many) {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

/** Verified today / waiting / rejected as one proportional strip: the state of the payment queue at a glance. */
function PaymentMix({ dashboard }) {
  const segments = [
    { key: "approved", label: "Verified today", value: dashboard.verifiedPaymentsTodayCount },
    { key: "pending", label: "To verify", value: dashboard.pendingPaymentsCount },
    { key: "rejected", label: "Rejected", value: dashboard.rejectedPaymentsCount },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  return (
    <figure className="dash-mix">
      <div className="dash-mix-head">
        <span className="dash-mix-title">Payments right now</span>
        <span className="dash-mix-total">{plural(total, "payment", "payments")}</span>
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

function DashboardSkeleton() {
  return (
    <div className="dash-layout" aria-busy="true" aria-label="Loading dashboard">
      <div className="dash-skeleton dash-skeleton-ledger" />
      <div className="dash-skeleton dash-skeleton-rail" />
      <div className="dash-skeleton dash-skeleton-departments" />
    </div>
  );
}

export default function SupportStaffDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getSupportStaffDashboard()
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

  const attention = dashboard
    ? [
        {
          count: dashboard.pendingPaymentsCount,
          label: "Payments to verify",
          detail: "Proof uploaded, not yet checked",
          to: "/support-staff/payments",
        },
        {
          count: dashboard.rejectedPaymentsCount,
          label: "Rejected payments",
          detail: "Waiting for the applicant's new proof",
          to: "/support-staff/payments",
        },
      ]
    : [];

  return (
    <AppLayout>
      <header className="dash-intro">
        <div className="dash-intro-text">
          <h1 className="dash-title">Support Staff</h1>
          <p className="dash-intro-meta">Payments, permits, results and applicant records</p>
        </div>
        <Link to="/support-staff/payments" className="btn btn-primary dash-intro-cta">
          Verify payments
          <Icon name="chevron-right" size={16} />
        </Link>
      </header>

      {isLoading && <DashboardSkeleton />}

      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && dashboard && (
        <div className="dash-layout dash-layout-scholarship">
          <section className="dash-panel dash-ledger" aria-label="Support Staff figures">
            <dl className="dash-figures">
              <div>
                <dt>Payments to verify</dt>
                <dd>{dashboard.pendingPaymentsCount.toLocaleString()}</dd>
                <p className="dash-figure-note">
                  {dashboard.pendingPaymentsCount > 0 ? "Waiting for you" : "Nothing waiting"}
                </p>
              </div>
              <div>
                <dt>Verified today</dt>
                <dd>{dashboard.verifiedPaymentsTodayCount.toLocaleString()}</dd>
                <p className={dashboard.verifiedPaymentsTodayCount > 0 ? "dash-figure-note dash-figure-note-up" : "dash-figure-note"}>
                  {dashboard.verifiedPaymentsTodayCount > 0 ? (
                    <>
                      <Icon name="trend-up" size={13} />
                      Payments verified today
                    </>
                  ) : (
                    "None verified yet today"
                  )}
                </p>
              </div>
            </dl>
            <PaymentMix dashboard={dashboard} />
          </section>

          <aside className="dash-panel dash-attention" aria-labelledby="dash-attention-title">
            <h2 id="dash-attention-title" className="dash-panel-title">
              Needs attention
            </h2>
            <ul>
              {attention.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className={`dash-task${item.count === 0 ? " dash-task-clear" : ""}`}>
                    <span className={`dash-task-count dash-task-count-${item.count === 0 ? "clear" : "amber"}`}>
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

          <section className="dash-panel dash-departments" aria-labelledby="dash-applicants-title">
            <div className="dash-panel-head">
              <h2 id="dash-applicants-title" className="dash-panel-title">
                Applicants
              </h2>
              <Link to="/support-staff/applicants" className="dash-link">
                Applicant records
                <Icon name="chevron-right" size={14} />
              </Link>
            </div>
            <dl className="dash-enroll-figures">
              <div>
                <dt>Total applicants</dt>
                <dd>{dashboard.totalApplicants.toLocaleString()}</dd>
                <p className="dash-figure-note">Registered applicant accounts</p>
              </div>
            </dl>
            <ul className="dash-enroll-list">
              {WORK_AREAS.map((area) => (
                <li key={area.to}>
                  <Link to={area.to} className="dash-link">
                    {area.label}
                  </Link>
                  <span className="dash-figure-note">{area.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
