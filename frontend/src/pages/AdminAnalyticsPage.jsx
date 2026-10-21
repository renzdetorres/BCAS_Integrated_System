import { useCallback, useEffect, useState } from "react";
import { getAdmissionAnalytics } from "../api/adminAnalyticsApi.js";
import { APPLICATION_TYPE_LABELS } from "../api/admissionApi.js";
import { DOCUMENT_TYPE_LABELS } from "../api/documentApi.js";
import { getScholarshipSlotReport } from "../api/adminReportsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useAcademicYear } from "../context/AcademicYearContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import ColumnChart from "../components/charts/ColumnChart.jsx";
import Heatmap from "../components/charts/Heatmap.jsx";
import Histogram from "../components/charts/Histogram.jsx";
import RangeChart from "../components/charts/RangeChart.jsx";
import Sparkline from "../components/charts/Sparkline.jsx";
import StackedRows from "../components/charts/StackedRows.jsx";
import TrendLines from "../components/charts/TrendLines.jsx";
import DonutChart from "../components/ui/DonutChart.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Icon from "../components/ui/Icon.jsx";
import RowBars from "../components/ui/RowBars.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import "../components/charts/charts.css";
import "./AdminAnalyticsPage.css";

const MAIN = "var(--viz-main)";
const CONTEXT = "var(--viz-context)";
const ORDINAL = ["var(--viz-ord-1)", "var(--viz-ord-2)", "var(--viz-ord-3)", "var(--viz-ord-4)"];
const LEVEL_ORDER = ["Elementary", "High School", "Senior High School", "College"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const BLOCKS = ["12 to 4 AM", "4 to 8 AM", "8 AM to 12", "12 to 4 PM", "4 to 8 PM", "8 PM to 12"];

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const plural = (n, word) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
const shortYear = (year) => `${year.slice(2, 4)}-${year.slice(7)}`;
const levelRank = (level) => (LEVEL_ORDER.includes(level) ? LEVEL_ORDER.indexOf(level) : LEVEL_ORDER.length);

function weekLabel(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** One headline figure: the number, the counts behind it, how it moved since the year before, and optionally a trend. */
function Kpi({ label, value, detail, change, unit, better, spark }) {
  let tone = "flat";
  let text = "No earlier year to compare";
  if (change !== null && change !== undefined) {
    if (change === 0) text = "Same as the year before";
    else {
      tone = (change > 0) === (better === "up") ? "good" : "bad";
      text = `${change > 0 ? "▲" : "▼"} ${Math.abs(change)} ${unit} vs the year before`;
    }
  }

  return (
    <div className="analytics-kpi">
      <span className="analytics-kpi-label">{label}</span>
      <div className="analytics-kpi-main">
        <b>{value}</b>
        {spark}
      </div>
      <span className="analytics-kpi-detail">{detail}</span>
      <span className={`analytics-delta analytics-delta-${tone}`}>{text}</span>
    </div>
  );
}

/** A titled group of panels, so the page reads as short sections instead of one long wall of charts. */
function Section({ id, title, intro, stale = false, children }) {
  return (
    <section className={`analytics-section${stale ? " is-stale" : ""}`} aria-labelledby={id} aria-busy={stale || undefined}>
      <header className="analytics-section-head">
        <h2 id={id}>{title}</h2>
        <p>{intro}</p>
      </header>
      {children}
    </section>
  );
}

/**
 * A chart's card: title, what is measured, the picture, and the plain-words takeaway. Every chart has a
 * table twin behind the "Table" switch, so each value can be read (or copied) without hovering.
 * `table` is { head: [...], rows: [[...]] }.
 */
function Panel({ title, aside, children, insight, table }) {
  const [asTable, setAsTable] = useState(false);

  return (
    <article className="dash-panel analytics-panel">
      <div className="dash-panel-head">
        <div className="analytics-panel-title">
          <h3 className="dash-panel-title">{title}</h3>
          {aside ? <span className="dash-panel-aside">{aside}</span> : null}
        </div>
        {table ? (
          <div className="analytics-view" role="group" aria-label={`${title} view`}>
            <button type="button" aria-pressed={!asTable} onClick={() => setAsTable(false)}>
              Chart
            </button>
            <button type="button" aria-pressed={asTable} onClick={() => setAsTable(true)}>
              Table
            </button>
          </div>
        ) : null}
      </div>
      <div className="analytics-panel-body">
        {asTable && table ? (
          <div className="analytics-table-scroll">
            <table className="viz-table">
              <thead>
                <tr>
                  {table.head.map((cell) => (
                    <th key={cell} scope="col">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, c) => (
                      <td key={c}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
      {insight ? <p className="analytics-insight">{insight}</p> : null}
    </article>
  );
}

/** The figures as a spreadsheet-friendly CSV, so a report can be pasted into Excel or a document. */
function toCsv(yearNote, rows) {
  const cell = (value) => `"${String(value).replace(/"/g, '""')}"`;
  return [["Section", "Item", "Value"], ["Report", "Period", yearNote], ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

export default function AdminAnalyticsPage() {
  const { academicYear, setAcademicYear, years } = useAcademicYear();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [slots, setSlots] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    () => {
      setErrorMessage(null);
      setIsRefreshing(true);
      return getAdmissionAnalytics(academicYear)
        .then((result) => {
          setData(result);
          setLoadedAt(new Date());
        })
        .catch((error) => {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the analytics.");
        })
        .finally(() => setIsRefreshing(false));
    },
    [academicYear],
  );

  // A new year (or Refresh) keeps what is on screen, dimmed, and swaps the numbers in place when they arrive.
// Only the very first load, with nothing to show yet, uses a skeleton.
  useEffect(() => {
    load();
  }, [load]);

  // Scholarship slots are not tied to an academic year, so they load once.
  useEffect(() => {
    let cancelled = false;
    getScholarshipSlotReport()
      .then((rows) => {
        if (!cancelled) setSlots(rows);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const yearNote = academicYear ? `Academic year ${academicYear}` : "All academic years";

  const actions = (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => load()} disabled={isRefreshing}>
        <span className={isRefreshing ? "analytics-spin" : undefined}>
          <Icon name="refresh" size={15} />
        </span>
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportCsv()} disabled={!data || data.funnel[0].count === 0}>
        <Icon name="download" size={15} />
        Export CSV
      </button>
    </>
  );

  const toolbar = (
    <div className="analytics-toolbar">
      <label className="analytics-year-pick">
        <span>Academic year</span>
        <select className="ui-select" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}>
          <option value="">All academic years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      {isRefreshing ? <span className="analytics-updated">Loading {yearNote.toLowerCase()}...</span> : loadedAt ? <span className="analytics-updated">Updated {loadedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span> : null}
    </div>
  );

  // The title, buttons and year picker are always on screen; only what is under them changes.
  const frame = (children) => (
    <AppLayout title="Analytics" actions={actions}>
      {toolbar}
      {errorMessage && data ? (
        <p className="form-error" role="alert">
          {errorMessage} The figures below are from the last successful load.
        </p>
      ) : null}
      {children}
    </AppLayout>
  );

  if (errorMessage && !data) {
    return frame(
      <p className="form-error" role="alert">
        {errorMessage}{" "}
        <button type="button" className="documents-view-link" onClick={() => load()}>
          Try again
        </button>
      </p>,
    );
  }

  if (!data) {
    return frame(
      <>
        <Skeleton variant="dashboard" />
        <Skeleton variant="table" />
      </>,
    );
  }

  const { funnel, kpis, previousKpis: before } = data;
  if (funnel[0].count === 0) {
    return frame(<EmptyState icon="chart" title="No applications for this selection" message={`${yearNote} has no admission applications yet. Pick another academic year above.`} />);
  }

  // ---- Headline figures
  const passRate = kpis.took > 0 ? pct(kpis.passed, kpis.took) : null;
  const beforePass = before && before.took > 0 ? pct(before.passed, before.took) : null;
  const paidRate = kpis.paymentsTotal > 0 ? pct(kpis.paymentsVerified, kpis.paymentsTotal) : null;
  const beforePaid = before && before.paymentsTotal > 0 ? pct(before.paymentsVerified, before.paymentsTotal) : null;
  const flagRate = kpis.documentsUploaded > 0 ? pct(kpis.documentsFlagged, kpis.documentsUploaded) : null;
  const beforeFlag = before && before.documentsUploaded > 0 ? pct(before.documentsFlagged, before.documentsUploaded) : null;
  const daysChange = before && kpis.medianDaysToDecision != null && before.medianDaysToDecision != null ? Math.round((kpis.medianDaysToDecision - before.medianDaysToDecision) * 10) / 10 : null;
  const passByYear = data.yearTrend.map((point) => (point.took > 0 ? pct(point.passed, point.took) : null));

  // ---- Funnel: the stage where the biggest drop lands is the one to look at
  let worst = 1;
  for (let i = 2; i < funnel.length; i += 1) {
    if (funnel[i - 1].count - funnel[i].count > funnel[worst - 1].count - funnel[worst].count) worst = i;
  }
  const lost = Math.max(funnel[worst - 1].count - funnel[worst].count, 0);

  // ---- Five-year trend
  const trend = data.yearTrend;
  const trendLast = trend[trend.length - 1];
  const trendPrev = trend[trend.length - 2];
  const trendChange = trendPrev && trendPrev.applicants > 0 ? Math.round(((trendLast.applicants - trendPrev.applicants) / trendPrev.applicants) * 100) : null;

  // ---- Weekly
  const weeks = data.weekly.map((week) => ({ label: weekLabel(week.weekStart), value: week.applications }));
  const lastFour = weeks.slice(-4).reduce((sum, week) => sum + week.value, 0);
  const priorFour = weeks.slice(-8, -4).reduce((sum, week) => sum + week.value, 0);
  const busiest = weeks.reduce((best, week) => (week.value > best.value ? week : best), weeks[0]);

  // ---- Who applies
  const levels = [...data.byLevel].sort((a, b) => levelRank(a.label) - levelRank(b.label) || b.count - a.count);
  const levelColor = (label) => (LEVEL_ORDER.includes(label) ? ORDINAL[LEVEL_ORDER.indexOf(label)] : CONTEXT);
  const types = data.byType.map((type, index) => ({ ...type, label: APPLICATION_TYPE_LABELS[type.label] ?? type.label, color: index === 0 ? MAIN : CONTEXT }));
  const totalApplications = levels.reduce((sum, level) => sum + level.count, 0);

  // ---- When they apply
  const heat = data.submissionHeat;
  let hotDay = 0;
  let hotBlock = 0;
  heat.forEach((row, r) => row.forEach((value, c) => (value > heat[hotDay][hotBlock] ? ((hotDay = r), (hotBlock = c)) : null)));
  const heatTotal = heat.flat().reduce((sum, value) => sum + value, 0);

  // ---- Pass rate by level
  const passLevels = data.passByLevel.filter((level) => level.took > 0).sort((a, b) => levelRank(a.level) - levelRank(b.level));
  const lowest = passLevels.length ? passLevels.reduce((a, b) => (pct(b.passed, b.took) < pct(a.passed, a.took) ? b : a)) : null;
  const highest = passLevels.length ? passLevels.reduce((a, b) => (pct(b.passed, b.took) > pct(a.passed, a.took) ? b : a)) : null;

  // ---- Score spread
  const scores = data.scores;
  const scored = scores.bins.reduce((sum, bin) => sum + bin.count, 0);
  const peakBin = scores.bins.reduce((best, bin) => (bin.count > best.count ? bin : best), scores.bins[0] ?? { count: 0 });

  // ---- Time per step
  const timed = data.steps.filter((step) => step.medianDays != null);
  const slowest = timed.length ? timed.reduce((a, b) => (b.medianDays > a.medianDays ? b : a)) : null;

  // ---- Payments
  const pay = data.payments;
  const payTotal = pay.verified + pay.pending + pay.rejected;

  // ---- Documents
  const documents = data.documents
    .filter((doc) => doc.uploaded > 0)
    .map((doc) => ({ ...doc, rate: pct(doc.flagged, doc.uploaded), label: DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType }))
    .sort((a, b) => b.rate - a.rate);
  const topRate = documents.length ? documents[0].rate : 0;

  // ---- Scholarship slots
  const scholarships = (slots ?? []).filter((row) => row.isActive);
  const openSlots = scholarships.reduce((sum, row) => sum + row.remainingSlots, 0);

  function exportCsv() {
    const rows = [
      ["Headline", "Exam pass rate", passRate === null ? "No exams yet" : `${passRate}% (${kpis.passed} of ${kpis.took})`],
      ["Headline", "Median days to a decision", kpis.medianDaysToDecision ?? "No decisions yet"],
      ["Headline", "Payments verified", paidRate === null ? "No payments yet" : `${paidRate}% (${kpis.paymentsVerified} of ${kpis.paymentsTotal})`],
      ["Headline", "Documents sent back", flagRate === null ? "No uploads yet" : `${flagRate}% (${kpis.documentsFlagged} of ${kpis.documentsUploaded})`],
      ...funnel.map((stage) => ["Applicant flow", stage.stage, stage.count]),
      ...trend.flatMap((point) => [
        ["Five academic years", `${point.academicYear} applicants`, point.applicants],
        ["Five academic years", `${point.academicYear} enrolled`, point.enrolled],
      ]),
      ...data.weekly.map((week) => ["Applications per week", `Week of ${week.weekStart}`, week.applications]),
      ...levels.map((level) => ["Applications by level", level.label, level.count]),
      ...types.map((type) => ["Applications by type", type.label, type.count]),
      ...heat.flatMap((row, r) => row.map((value, c) => ["When applicants apply", `${DAYS[r]}, ${BLOCKS[c]}`, value])),
      ...passLevels.map((level) => ["Exam pass rate by level", level.level, `${pct(level.passed, level.took)}% (${level.passed} of ${level.took})`]),
      ...scores.bins.map((bin) => ["Exam score spread", `${bin.from} to ${bin.to}`, bin.count]),
      ...data.steps.map((step) => ["Days per step", step.step, step.medianDays == null ? "No data yet" : `median ${step.medianDays}, middle half ${step.p25} to ${step.p75}`]),
      ["Exam fee payments", "Verified", pay.verified],
      ["Exam fee payments", "Waiting for staff", pay.pending],
      ["Exam fee payments", "Rejected", pay.rejected],
      ...documents.map((doc) => ["Documents sent back", doc.label, `${doc.rate}% (${doc.flagged} of ${doc.uploaded})`]),
      ...scholarships.map((row) => ["Scholarship slots", row.name, `${row.occupiedSlots} of ${row.totalSlots}`]),
    ];
    const url = URL.createObjectURL(new Blob([`﻿${toCsv(yearNote, rows)}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bcas-analytics-${academicYear || "all-years"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Analytics exported as a CSV file.");
  }

  return frame(
    <>
      <Section stale={isRefreshing} id="an-overview" title="Overview" intro="Four numbers that show how the admission process is going.">
        <div className="analytics-kpis">
          <Kpi
            label="Exam pass rate"
            value={passRate === null ? "No exams yet" : `${passRate}%`}
            detail={kpis.took > 0 ? `${kpis.passed} of ${kpis.took} who took the exam` : "Nobody has taken the exam"}
            change={passRate !== null && beforePass !== null ? passRate - beforePass : null}
            unit="pts"
            better="up"
            spark={<Sparkline values={passByYear} label={`Pass rate by academic year: ${passByYear.map((v, i) => `${trend[i].academicYear} ${v === null ? "no exams" : `${v}%`}`).join(", ")}`} />}
          />
          <Kpi
            label="Median days to a decision"
            value={kpis.medianDaysToDecision == null ? "No decisions yet" : kpis.medianDaysToDecision.toFixed(1)}
            detail="From submission to approved or rejected"
            change={daysChange}
            unit="days"
            better="down"
          />
          <Kpi
            label="Payments verified"
            value={paidRate === null ? "No payments yet" : `${paidRate}%`}
            detail={kpis.paymentsTotal > 0 ? `${kpis.paymentsVerified} of ${kpis.paymentsTotal} proofs submitted` : "No proofs submitted"}
            change={paidRate !== null && beforePaid !== null ? paidRate - beforePaid : null}
            unit="pts"
            better="up"
          />
          <Kpi
            label="Documents sent back"
            value={flagRate === null ? "No uploads yet" : `${flagRate}%`}
            detail={kpis.documentsUploaded > 0 ? `${kpis.documentsFlagged} of ${kpis.documentsUploaded} uploads` : "No documents uploaded"}
            change={flagRate !== null && beforeFlag !== null ? flagRate - beforeFlag : null}
            unit="pts"
            better="down"
          />
        </div>
      </Section>

      <Section stale={isRefreshing} id="an-flow" title="Applicant flow" intro="How many applicants reach each stage, how the years compare, and when and who applies.">
        <Panel
          title="Where applicants drop off"
          aside="Applications that reached each stage"
          table={{ head: ["Stage", "Applications", "Of the previous stage"], rows: funnel.map((stage, i) => [stage.stage, stage.count.toLocaleString(), i === 0 ? "100%" : `${pct(stage.count, funnel[i - 1].count)}%`]) }}
          insight={
            <>
              The biggest drop is between <b>{funnel[worst - 1].stage}</b> and <b>{funnel[worst].stage}</b> (the highlighted column): {plural(lost, "application")} ({100 - pct(funnel[worst].count, funnel[worst - 1].count)}%) did not continue.{" "}
              {pct(funnel[6].count, funnel[0].count)}% of everyone who applied is enrolled.
            </>
          }
        >
          <ColumnChart
            ariaLabel="Applications that reached each stage"
            items={funnel.map((stage, index) => ({
              label: stage.stage,
              value: stage.count,
              note: index === 0 ? "100%" : `${pct(stage.count, funnel[index - 1].count)}% of previous`,
              tone: index === worst ? "highlight" : undefined,
            }))}
          />
        </Panel>

        <div className="analytics-pair">
          <Panel
            title="Five academic years"
            aside="Applicants and enrolled"
            table={{ head: ["Academic year", "Applicants", "Enrolled", "Took the exam", "Passed"], rows: trend.map((p) => [p.academicYear, p.applicants, p.enrolled, p.took, p.passed]) }}
            insight={
              trendChange === null ? null : (
                <>
                  <b>{trendLast.academicYear}</b> has {plural(trendLast.applicants, "applicant")}, {trendChange === 0 ? "the same as" : `${trendChange > 0 ? "up" : "down"} ${Math.abs(trendChange)}% on`} {trendPrev.academicYear}. {plural(trendLast.enrolled, "applicant")} enrolled so far.
                </>
              )
            }
          >
            <TrendLines
              ariaLabel="Applicants and enrolled by academic year"
              labels={trend.map((p) => shortYear(p.academicYear))}
              series={[
                { label: "Applicants", color: CONTEXT, values: trend.map((p) => p.applicants) },
                { label: "Enrolled", color: MAIN, values: trend.map((p) => p.enrolled) },
              ]}
            />
          </Panel>

          <Panel
            title="Applications per week"
            aside="Last 12 weeks"
            table={{ head: ["Week of", "Applications"], rows: weeks.map((w) => [w.label, w.value]) }}
            insight={
              <>
                Busiest week: <b>{busiest.label}</b> with {plural(busiest.value, "application")}. The last four weeks brought <b>{lastFour}</b>
                {priorFour > 0 ? `, ${lastFour < priorFour ? "down" : "up"} ${pct(Math.abs(lastFour - priorFour), priorFour)}% on the four before.` : "."}
              </>
            }
          >
            <TrendLines ariaLabel="Applications per week" labels={weeks.map((w) => w.label)} series={[{ label: "Applications", color: MAIN, values: weeks.map((w) => w.value) }]} peakLabel="busiest" />
          </Panel>
        </div>

        <div className="analytics-pair">
          <Panel
            title="Who applies"
            aside={`${totalApplications.toLocaleString()} applications`}
            table={{ head: ["Group", "Applications", "Share"], rows: [...levels.map((l) => [`Level: ${l.label}`, l.count, `${pct(l.count, totalApplications)}%`]), ...types.map((t) => [`Type: ${t.label}`, t.count, `${pct(t.count, totalApplications)}%`])] }}
            insight={levels.length ? <><b>{levels.reduce((a, b) => (b.count > a.count ? b : a)).label}</b> has the most applications ({pct(levels.reduce((a, b) => (b.count > a.count ? b : a)).count, totalApplications)}%).</> : null}
          >
            <div className="analytics-stack-group">
              <StackedRows
                ariaLabel="Applications by level"
                legend={levels.map((l) => ({ label: l.label, color: levelColor(l.label) }))}
                rows={[{ label: "By level", total: totalApplications.toLocaleString(), segments: levels.map((l) => ({ label: l.label, value: l.count, color: levelColor(l.label) })) }]}
              />
              <StackedRows
                ariaLabel="Applications by type"
                legend={types.map((t) => ({ label: t.label, color: t.color }))}
                rows={[{ label: "By type", total: totalApplications.toLocaleString(), segments: types.map((t) => ({ label: t.label, value: t.count, color: t.color })) }]}
              />
            </div>
          </Panel>

          <Panel
            title="When applicants apply"
            aside="By weekday and time of day"
            table={{ head: ["Day", ...BLOCKS], rows: heat.map((row, r) => [DAYS[r], ...row]) }}
            insight={heatTotal > 0 ? <>Most applications come in on <b>{DAYS[hotDay]}</b>, {BLOCKS[hotBlock]} ({heat[hotDay][hotBlock]} of {heatTotal}). Times are school time.</> : null}
          >
            <Heatmap ariaLabel="Applications by weekday and time of day" rows={DAYS.map((d) => d.slice(0, 3))} columns={BLOCKS} values={heat} />
          </Panel>
        </div>
      </Section>

      <Section stale={isRefreshing} id="an-exam" title="Entrance exam" intro="How applicants do, level by level, and how the scores are spread around the passing mark.">
        <div className="analytics-pair">
          <Panel
            title="Exam pass rate by level"
            aside="Passed of those with a result"
            table={{ head: ["Level", "Took the exam", "Passed", "Pass rate"], rows: passLevels.map((l) => [l.level, l.took, l.passed, `${pct(l.passed, l.took)}%`]) }}
            insight={passLevels.length > 1 ? <><b>{highest.level}</b> passes most often ({pct(highest.passed, highest.took)}%); <b>{lowest.level}</b> least ({pct(lowest.passed, lowest.took)}%).</> : null}
          >
            {passLevels.length === 0 ? (
              <p className="analytics-none">No exam results recorded yet.</p>
            ) : (
              <StackedRows
                ariaLabel="Exam pass rate by level"
                legend={[
                  { label: "Passed", color: MAIN },
                  { label: "Did not pass", color: CONTEXT },
                ]}
                rows={passLevels.map((l) => ({
                  label: l.level,
                  total: `${pct(l.passed, l.took)}% (${l.passed} of ${l.took})`,
                  segments: [
                    { label: "Passed", value: l.passed, color: MAIN },
                    { label: "Did not pass", value: l.took - l.passed, color: CONTEXT },
                  ],
                }))}
              />
            )}
          </Panel>

          <Panel
            title="Exam score spread"
            aside={`First attempts, out of ${scores.totalItems}`}
            table={{ head: ["Score", "Applicants"], rows: scores.bins.map((b) => [`${b.from} to ${b.to}`, b.count]) }}
            insight={scored > 0 ? <>Most scores fall between <b>{peakBin.from}</b> and <b>{peakBin.to}</b>. The passing score is {Number(scores.passingScore)} of {scores.totalItems}; darker bars are at or above it.</> : null}
          >
            {scored === 0 ? (
              <p className="analytics-none">No exam scores recorded yet.</p>
            ) : (
              <Histogram ariaLabel="How first-attempt exam scores are spread" bins={scores.bins} total={scores.totalItems} passMark={Number(scores.passingScore)} />
            )}
          </Panel>
        </div>
      </Section>

      <Section stale={isRefreshing} id="an-processing" title="Processing" intro="How long each step takes and how smoothly payments go.">
        <div className="analytics-pair">
          <Panel
            title="Time each step takes"
            aside="Days: median and the middle half"
            table={{ head: ["Step", "Median days", "Middle half", "Last year's median", "Cases"], rows: data.steps.map((s) => [s.step, s.medianDays ?? "No data yet", s.p25 == null ? "" : `${s.p25} to ${s.p75}`, s.previousMedianDays ?? "", s.samples]) }}
            insight={slowest ? <><b>{slowest.step}</b> is the slowest step at {slowest.medianDays.toFixed(1)} days (highlighted).</> : null}
          >
            <RangeChart
              ariaLabel="Days each step takes"
              rows={data.steps.map((s) => ({ label: s.step, median: s.medianDays, p25: s.p25, p75: s.p75, before: s.previousMedianDays, samples: s.samples }))}
            />
          </Panel>

          <Panel
            title="Exam fee payments"
            aside="Proofs submitted"
            table={{ head: ["Outcome", "Proofs", "Share"], rows: [["Verified", pay.verified, `${pct(pay.verified, payTotal)}%`], ["Waiting for staff", pay.pending, `${pct(pay.pending, payTotal)}%`], ["Rejected", pay.rejected, `${pct(pay.rejected, payTotal)}%`]] }}
            insight={payTotal > 0 ? <><b>{pct(pay.verified, payTotal)}%</b> of proofs are verified and <b>{pct(pay.rejected, payTotal)}%</b> rejected.</> : null}
          >
            {payTotal === 0 ? (
              <p className="analytics-none">No proofs of payment yet.</p>
            ) : (
              <DonutChart
                centerLabel="Proofs"
                valueFormatter={(value) => `${value.toLocaleString()} (${pct(value, payTotal)}%)`}
                segments={[
                  { label: "Verified", value: pay.verified, color: "#1b6b3a" },
                  { label: "Waiting for staff", value: pay.pending, color: "#c07a00" },
                  { label: "Rejected", value: pay.rejected, color: "#b42828" },
                ]}
              />
            )}
          </Panel>
        </div>
      </Section>

      <Section stale={isRefreshing} id="an-quality" title="Documents and scholarships" intro="Which uploads need a second try, and how many scholarship slots are left.">
        <div className="analytics-pair">
          <Panel
            title="Documents sent back"
            aside="Flagged or rejected, not yet fixed"
            table={{ head: ["Document", "Uploaded", "Sent back", "Share"], rows: documents.map((d) => [d.label, d.uploaded, d.flagged, `${d.rate}%`]) }}
            insight={documents.length && topRate > 0 ? <><b>{documents[0].label}</b> is sent back most often ({topRate}% of uploads).</> : null}
          >
            {documents.length === 0 ? (
              <p className="analytics-none">No documents uploaded in this period.</p>
            ) : (
              <RowBars
                label="Share of uploads sent back, by document"
                items={documents.map((doc) => ({ label: doc.label, value: doc.rate, text: `${doc.rate}% (${doc.flagged} of ${doc.uploaded})`, highlight: doc.rate === topRate && topRate > 0 }))}
              />
            )}
          </Panel>

          <Panel
            title="Scholarship slots"
            aside="Filled of total, active scholarships"
            table={{ head: ["Scholarship", "Filled", "Total", "Open"], rows: scholarships.map((s) => [s.name, s.occupiedSlots, s.totalSlots, s.remainingSlots]) }}
            insight={slots && scholarships.length ? (openSlots > 0 ? <><b>{openSlots}</b> slots are still open.</> : <b>Every slot is filled.</b>) : null}
          >
            {slots === null ? (
              <Skeleton />
            ) : scholarships.length === 0 ? (
              <p className="analytics-none">No active scholarships.</p>
            ) : (
              <RowBars
                label="Scholarship slots filled"
                max={100}
                items={scholarships.map((row) => ({
                  label: row.name,
                  value: pct(row.occupiedSlots, row.totalSlots),
                  text: `${row.occupiedSlots} of ${row.totalSlots}`,
                  highlight: row.remainingSlots > 0,
                }))}
              />
            )}
          </Panel>
        </div>
      </Section>
    </>,
  );
}
