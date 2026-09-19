import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Calendar, FileText, FolderOpen, Megaphone, ChevronRight } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import { getUpcomingDeadlines } from "../api/dashboardApi.js";
import { getMyDocumentChecklist } from "../api/documentApi.js";
import { getActiveAnnouncements } from "../api/announcementApi.js";
import { useSession } from "../context/SessionContext.jsx";

const DEADLINE_TYPE_LABELS = {
  ScholarshipDeadline: "Scholarship Application Deadline",
  DocumentDeadline: "Document Submission Deadline",
  EnrollmentPeriod: "Enrollment Period Opens",
};

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isRecent(isoDate) {
  return Date.now() - new Date(isoDate).getTime() < 3 * 24 * 60 * 60 * 1000;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function ApplicantDashboardPage() {
  const { session } = useSession();
  const [deadlines, setDeadlines] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState(0);
  const [newAnnouncements, setNewAnnouncements] = useState(0);

  useEffect(() => {
    getUpcomingDeadlines().then(setDeadlines).catch(() => {});
    getMyDocumentChecklist()
      .then((data) => {
        const pending = data.requirements.filter((r) => r.status !== "Verified").length;
        setPendingDocuments(pending);
      })
      .catch(() => {});
    getActiveAnnouncements()
      .then((data) => setNewAnnouncements(data.filter((a) => isRecent(a.postedAt)).length))
      .catch(() => {});
  }, []);

  return (
    <AppShell badges={{ documents: pendingDocuments || undefined }} notificationCount={newAnnouncements}>
      <h1 className="text-2xl font-extrabold text-slate-900">
        {greeting()}, {session.firstName}! 👋
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Here's a summary of your application status for SY 2025-2026.
      </p>

      <Card className="mt-6">
        <h2 className="text-lg font-bold text-slate-900">Upcoming Deadlines</h2>
        <div className="mt-4 space-y-3">
          {deadlines.length === 0 && <p className="text-sm text-slate-400">No upcoming deadlines.</p>}
          {deadlines.map((deadline) => {
            const isWarning = deadline.type === "ScholarshipDeadline";
            return (
              <div
                key={`${deadline.type}-${deadline.date}`}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                  isWarning ? "bg-status-amberBg" : "bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    isWarning ? "bg-white text-status-amber" : "bg-white text-slate-400"
                  }`}
                >
                  {isWarning ? <AlertTriangle size={18} /> : <Calendar size={18} />}
                </span>
                <div>
                  <p className="font-bold text-slate-900">
                    {DEADLINE_TYPE_LABELS[deadline.type] ?? deadline.title} — {formatDate(deadline.date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/app/my-application">
          <Card className="flex h-full items-center gap-3 transition-shadow hover:shadow-lg">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
              <FileText size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">My Application</p>
              <p className="text-sm text-slate-500">View or apply</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-slate-300" />
          </Card>
        </Link>

        <Link to="/documents">
          <Card className="flex h-full items-center gap-3 transition-shadow hover:shadow-lg">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
              <FolderOpen size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">Documents</p>
              <p className="text-sm text-slate-500">{pendingDocuments} pending uploads</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-slate-300" />
          </Card>
        </Link>

        <Link to="/announcements">
          <Card className="flex h-full items-center gap-3 transition-shadow hover:shadow-lg">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
              <Megaphone size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">Announcements</p>
              <p className="text-sm text-slate-500">{newAnnouncements} new announcements</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-slate-300" />
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}
