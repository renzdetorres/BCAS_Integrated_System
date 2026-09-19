import { useCallback, useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import Modal from "../components/ui/Modal.jsx";
import { inputClasses, labelClasses, primaryButtonClasses, outlineButtonClasses } from "../lib/formStyles.js";
import {
  createAnnouncement,
  listAnnouncements,
  setAnnouncementActiveStatus,
} from "../api/academicHeadAnnouncementsApi.js";
import { ApiError } from "../api/apiClient.js";

const initialCreateForm = { category: "Admission", title: "", body: "" };
const TABS = ["All", "Published", "Draft"];

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function AcademicHeadAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState(null);
  const [tab, setTab] = useState("All");

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listAnnouncements();
      setAnnouncements(data);
      setLoadError(null);
      setIsForbidden(false);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load announcements.");
      setIsForbidden(error instanceof ApiError && error.status === 403);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      await createAnnouncement(createForm);
      setCreateForm(initialCreateForm);
      setCreateOpen(false);
      await loadAnnouncements();
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : "Failed to create the announcement.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggle(announcement) {
    setPendingToggleId(announcement.announcementId);
    setLoadError(null);
    try {
      const updated = await setAnnouncementActiveStatus(announcement.announcementId, !announcement.isActive);
      setAnnouncements((prev) => prev.map((a) => (a.announcementId === updated.announcementId ? updated : a)));
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to update the announcement's status.");
    } finally {
      setPendingToggleId(null);
    }
  }

  const rows = announcements.filter((a) => {
    if (tab === "Published") return a.isActive;
    if (tab === "Draft") return !a.isActive;
    return true;
  });

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Announcements</h1>
          <p className="mt-1 text-sm text-slate-500">
            Available if an Admin-Registrar has authorized this area for your role.
          </p>
        </div>
        {!isForbidden && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark"
          >
            + New Announcement
          </button>
        )}
      </div>

      {isForbidden ? (
        <Card className="mt-6">
          <p className="text-sm font-medium text-status-red" role="alert">
            {loadError}
          </p>
        </Card>
      ) : (
        <>
          <div className="mt-6 flex gap-2 border-b border-slate-200">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
                  tab === t ? "border-forest text-forest" : "border-transparent text-slate-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loadError && (
            <p className="mt-4 text-sm font-medium text-status-red" role="alert">
              {loadError}
            </p>
          )}

          <div className="mt-6 space-y-3">
            {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
            {!isLoading && rows.length === 0 && <p className="text-sm text-slate-400">No announcements yet.</p>}
            {!isLoading &&
              rows.map((a) => (
                <Card key={a.announcementId}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
                      <Megaphone size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{a.title}</p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            a.isActive ? "bg-status-greenBg text-status-green" : "border border-slate-300 text-slate-500"
                          }`}
                        >
                          {a.isActive ? "Published" : "Draft"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        For: {a.category} · {formatDate(a.postedAt)}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{a.body}</p>
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(a)}
                        disabled={pendingToggleId === a.announcementId}
                        className={
                          a.isActive
                            ? "rounded-lg border border-status-red px-4 py-2 text-sm font-semibold text-status-red hover:bg-status-redBg disabled:opacity-50"
                            : `${outlineButtonClasses} !border-status-green !text-status-green`
                        }
                      >
                        {pendingToggleId === a.announcementId ? "Saving..." : a.isActive ? "Archive" : "Publish"}
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}

      {isCreateOpen && (
        <Modal title="New Announcement" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            <div>
              <label className={labelClasses} htmlFor="category">
                Audience
              </label>
              <select
                id="category"
                className={inputClasses}
                value={createForm.category}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="Admission">Admission</option>
                <option value="Scholarship">Scholarship</option>
              </select>
            </div>
            <div>
              <label className={labelClasses} htmlFor="title">
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                maxLength={200}
                className={inputClasses}
                value={createForm.title}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="body">
                Body
              </label>
              <textarea
                id="body"
                rows={4}
                required
                maxLength={2000}
                className={inputClasses}
                value={createForm.body}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, body: event.target.value }))}
              />
            </div>

            {createError && (
              <p className="text-sm font-medium text-status-red" role="alert">
                {createError}
              </p>
            )}

            <button type="submit" disabled={isCreating} className={`${primaryButtonClasses} w-full`}>
              {isCreating ? "Creating..." : "Save as Draft"}
            </button>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
