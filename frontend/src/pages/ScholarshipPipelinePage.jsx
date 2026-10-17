import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getScholarshipApplicants,
  getScholarshipSummary,
  getTopGrantees,
  recordScholarshipExamResult,
  recordScholarshipInterview,
} from "../api/scholarshipPipelineApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { ACADEMIC_CATEGORIES } from "../config/academicStructure.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import Modal from "../components/ui/Modal.jsx";
import StatusBadge, { statusLabel } from "../components/ui/StatusBadge.jsx";
import "./StaffPaymentsPage.css";
import "./ScholarshipPipelinePage.css";

const SCHOLARSHIP_LEVELS = ["Grade 7", "Grade 11", "First Year College"];

const EXAM_TONE = { Passed: "Approved", Failed: "Rejected", Taken: "UnderReview", Scheduled: "UnderReview", "Not yet": "Pending" };

function academicYears(now = new Date()) {
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 5 }, (_, i) => `${start - i}-${start - i + 1}`);
}

function ExamModal({ row, onClose, onSaved }) {
  const { showToast } = useToast();
  const [result, setResult] = useState("Passed");
  const [score, setScore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await recordScholarshipExamResult(row.applicationId, { result, score, remarks: remarks.trim() });
      showToast(result === "Passed" ? "Recorded. The applicant is qualified for the interview and essay." : "Recorded. The scholarship is closed and the applicant is pointed to regular admission.");
      await onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSaving}
      title="Scholarship exam result"
      subtitle={`${row.applicantName} · ${row.scholarshipName}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Record result"}
          </button>
        </>
      }
    >
      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
      <fieldset className="choice-group">
        <legend className="form-section-title" style={{ marginTop: 0 }}>
          Result
        </legend>
        <div className="choice-grid choice-grid-3">
          {["Passed", "Failed"].map((value) => (
            <label key={value} className={`choice-tile${result === value ? " choice-tile-checked" : ""}`}>
              <input type="radio" name="scholarship-result" value={value} checked={result === value} onChange={() => setResult(value)} />
              <span className="choice-tile-title">{value}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="form-note">
        {result === "Passed"
          ? "The applicant becomes qualified for the interview and essay."
          : "The scholarship application is closed and the applicant is advised to continue with regular admission."}
      </p>
      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="exam-score">Score (optional)</label>
          <input id="exam-score" type="number" min="0" max="100" step="0.01" value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <label htmlFor="exam-remarks">Remarks (optional)</label>
        <textarea id="exam-remarks" rows={3} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
    </Modal>
  );
}

function InterviewModal({ row, onClose, onSaved }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ interviewScore: "", essayScore: "", notes: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  async function handleSave() {
    if (form.interviewScore === "" && form.essayScore === "") {
      setErrorMessage("Enter the interview score, the essay score, or both.");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await recordScholarshipInterview(row.applicationId, { ...form, notes: form.notes.trim() });
      showToast("Scores recorded. The application is ready for the scholarship result.");
      await onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSaving}
      title="Interview and essay"
      subtitle={`${row.applicantName} · ${row.scholarshipName}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Record scores"}
          </button>
        </>
      }
    >
      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="interviewScore">Interview score</label>
          <input id="interviewScore" name="interviewScore" type="number" min="0" max="100" step="0.01" value={form.interviewScore} onChange={change} />
        </div>
        <div className="form-row">
          <label htmlFor="essayScore">Essay score</label>
          <input id="essayScore" name="essayScore" type="number" min="0" max="100" step="0.01" value={form.essayScore} onChange={change} />
        </div>
      </div>
      <div className="form-row">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" name="notes" rows={3} maxLength={500} value={form.notes} onChange={change} />
        <p className="form-note">The ranking uses the average of the exam, interview and essay scores.</p>
      </div>
    </Modal>
  );
}

export function Grantees() {
  const { session } = useSession();
  const [filters, setFilters] = useState({ department: "", level: "", academicYear: "" });
  const [rows, setRows] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const scoped = session.role === "AcademicHead";

  useEffect(() => {
    let cancelled = false;
    getTopGrantees(filters)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the grantees.");
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const change = (name) => (event) => setFilters((prev) => ({ ...prev, [name]: event.target.value }));

  return (
    <Card>
      <h2 className="pipeline-heading">Top 10 scholarship grantees</h2>
      <p className="pipeline-note">Approved scholars ranked by the average of their exam, interview and essay scores.</p>
      <div className="grantee-filters">
        {!scoped && (
          <label>
            <span>Department / program</span>
            <select value={filters.department} onChange={change("department")}>
              <option value="">All</option>
              {ACADEMIC_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Academic level</span>
          <select value={filters.level} onChange={change("level")}>
            <option value="">All</option>
            {SCHOLARSHIP_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Academic year</span>
          <select value={filters.academicYear} onChange={change("academicYear")}>
            <option value="">All</option>
            {academicYears().map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}

      {rows && rows.length === 0 && <p className="dash-empty">No grantees match these filters yet.</p>}
      {rows && rows.length > 0 && (
        <ol className="grantee-list">
          {rows.map((g) => (
            <li key={g.applicationId}>
              <span className="grantee-rank">{g.rank}</span>
              <span className="grantee-who">
                <strong>{g.applicantName}</strong>
                <small>
                  {[g.scholarshipName, g.level, g.department].filter(Boolean).join(" · ")} · {g.academicYear}
                </small>
              </span>
              <span className="grantee-score">{g.totalScore != null ? g.totalScore.toFixed(2) : "-"}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default function ScholarshipPipelinePage() {
  const { session } = useSession();
  const canRecord = session.role === "Admin" || session.role === "Evaluator";
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryData, rowData] = await Promise.all([getScholarshipSummary(), getScholarshipApplicants()]);
      setSummary(summaryData);
      setRows(rowData);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load scholarship data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filters = {
    all: () => true,
    pending: (r) => r.status !== "Approved" && r.status !== "Rejected",
    exam: (r) => r.needsExamResult,
    qualified: (r) => r.qualifiedForInterview,
    grantees: (r) => r.status === "Approved",
  };
  const shown = rows.filter(
    (r) =>
      filters[filter](r) &&
      (!levelFilter || r.level === levelFilter) &&
      (!programFilter || r.department === programFilter) &&
      (!statusFilter || r.status === statusFilter),
  );
  const distinct = (pick) => [...new Set(rows.map(pick).filter(Boolean))].sort();
  const levelOptions = [...new Set([...SCHOLARSHIP_LEVELS, ...distinct((r) => r.level)])].map((value) => ({ value, label: value }));
  const programOptions = distinct((r) => r.department).map((value) => ({ value, label: value }));
  const statusOptions = distinct((r) => r.status).map((value) => ({ value, label: statusLabel(value) }));
  // Only the cards that name a list filter it; the rest are plain figures.
  const card = (label, value, key) => ({ label, value: value ?? 0, ...(key ? { onClick: () => setFilter(key), active: filter === key } : {}) });

  const columns = [
    {
      key: "applicant",
      header: "Applicant",
      accessor: (row) => row.applicantName,
      sortable: true,
      render: (row) => <PersonCell name={row.applicantName} detail={row.applicantEmail} />,
    },
    {
      key: "level",
      header: "Level / program",
      accessor: (row) => `${row.level ?? ""} ${row.department ?? ""}`,
      render: (row) => <PersonCell name={row.level ?? "-"} detail={[row.department, row.scholarshipName].filter(Boolean).join(" · ")} />,
    },
    { key: "status", header: "Status", accessor: (row) => row.status, sortable: true, render: (row) => <StatusBadge status={row.status} adminContext /> },
    {
      key: "exam",
      header: "Result",
      accessor: (row) => row.examStatus,
      sortable: true,
      render: (row) => <StatusBadge status={EXAM_TONE[row.examStatus] ?? "Pending"} label={row.examStatus} />,
    },
    {
      key: "total",
      header: "Score",
      align: "right",
      accessor: (row) => row.totalScore ?? -1,
      sortable: true,
      searchable: false,
      render: (row) => (row.totalScore != null ? row.totalScore.toFixed(2) : <span className="ui-cell-muted">-</span>),
    },
    {
      key: "action",
      header: "Action",
      searchable: false,
      render: (row) => {
        if (!canRecord) return null;
        if (row.needsExamResult)
          return <RowAction label="Record exam" icon="pencil" onClick={() => setActive({ mode: "exam", row })} ariaLabel={`Record ${row.applicantName}'s scholarship exam result`} />;
        if (row.needsInterviewEvaluation)
          return <RowAction label="Score interview" icon="pencil" onClick={() => setActive({ mode: "interview", row })} ariaLabel={`Score ${row.applicantName}'s interview and essay`} />;
        return null;
      },
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Scholarship Exam, Interview & Grantees"
        subtitle={
          canRecord
            ? "Screened applicants take the scholarship exam. Those who pass are qualified for the interview and essay; the Academic Head then releases the scholarship result."
            : "Where each scholarship applicant stands in the exam, the interview and essay, and the result."
        }
        actions={
          session.role === "Admin" ? (
            <Link className="btn btn-secondary" to="/admin/scholarships">
              Manage scholarships
            </Link>
          ) : null
        }
        columns={columns}
        rows={shown}
        getRowKey={(row) => row.applicationId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage="No scholarship applicants match this filter."
        searchPlaceholder="Search by applicant or scholarship"
        filters={[
          { key: "level", label: "All levels", value: levelFilter, onChange: setLevelFilter, options: levelOptions },
          { key: "program", label: "All programs", value: programFilter, onChange: setProgramFilter, options: programOptions },
          { key: "status", label: "All statuses", value: statusFilter, onChange: setStatusFilter, options: statusOptions },
        ]}
        summary={[
          card("Total applicants", summary?.totalApplicants, "all"),
          card("Took the exam", summary?.tookExam),
          card("Passed", summary?.passed),
          card("Pending", summary?.pending, "pending"),
          card("Qualified for interview / essay", summary?.qualifiedForInterview, "qualified"),
          card("Grantees", summary?.grantees, "grantees"),
        ]}
        summaryNote={filter === "all" ? "Select Pending, Qualified or Grantees to filter the list." : "Select Total applicants to see everyone."}
      />

      <Grantees />

      {active?.mode === "exam" && <ExamModal row={active.row} onClose={() => setActive(null)} onSaved={load} />}
      {active?.mode === "interview" && <InterviewModal row={active.row} onClose={() => setActive(null)} onSaved={load} />}
    </AppLayout>
  );
}
