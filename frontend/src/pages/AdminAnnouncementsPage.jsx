import { useCallback, useEffect, useState } from "react";
import {
  createAnnouncement,
  listAnnouncements,
  setAnnouncementActiveStatus,
} from "../api/adminAnnouncementsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./AdminAnnouncementsPage.css";

const initialCreateForm = { category: "Admission", title: "", body: "" };

function formatDateTime(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [pendingToggleId, setPendingToggleId] = useState(null);

  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createdMessage, setCreatedMessage] = useState(null);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listAnnouncements();
      setAnnouncements(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load announcements.");
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
    setCreatedMessage(null);
    setIsCreating(true);
    try {
      await createAnnouncement(createForm);
      setCreateForm(initialCreateForm);
      setCreatedMessage("Announcement created as a draft. Post it below to make it visible to applicants.");
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
      setAnnouncements((prev) =>
        prev.map((a) => (a.announcementId === updated.announcementId ? updated : a)),
      );
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to update the announcement's status.");
    } finally {
      setPendingToggleId(null);
    }
  }

  return (
    <AppLayout title="Announcements">
      <Card className="admin-announcements-card">
        <h2>Create Announcement</h2>
        <p className="admin-announcements-subtitle">
          New announcements start as drafts. Post one to make it visible to applicants; deactivate it to hide it
          again without deleting it.
        </p>

        {createdMessage && (
          <p className="form-success" role="status">
            {createdMessage}
          </p>
        )}
        {createError && (
          <p className="form-error" role="alert">
            {createError}
          </p>
        )}

        <form onSubmit={handleCreate} noValidate>
          <div className="form-row">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={createForm.category}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="Admission">Admission</option>
              <option value="Scholarship">Scholarship</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              required
              maxLength={200}
              value={createForm.title}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="form-row">
            <label htmlFor="body">Body</label>
            <textarea
              id="body"
              rows={4}
              required
              maxLength={2000}
              value={createForm.body}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, body: event.target.value }))}
            />
          </div>

          <button type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Announcement"}
          </button>
        </form>
      </Card>

      <Card className="admin-announcements-card">
        <h2>All Announcements</h2>

        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : announcements.length === 0 ? (
          <p>No announcements yet.</p>
        ) : (
          <ul className="admin-announcements-list">
            {announcements.map((announcement) => (
              <li key={announcement.announcementId}>
                <div className="admin-announcements-list-header">
                  <span className={`announcements-category category-${announcement.category.toLowerCase()}`}>
                    {announcement.category}
                  </span>
                  <StatusBadge status={announcement.isActive ? "Active" : "Draft"} label={announcement.isActive ? "Posted" : "Draft"} />
                  <span className="admin-announcements-date">{formatDateTime(announcement.postedAt)}</span>
                </div>
                <p className="admin-announcements-title">{announcement.title}</p>
                <p className="admin-announcements-body">{announcement.body}</p>
                <div className="row-actions">
                  <button
                    type="button"
                    className={announcement.isActive ? "toggle-deactivate" : "toggle-activate"}
                    onClick={() => handleToggle(announcement)}
                    disabled={pendingToggleId === announcement.announcementId}
                  >
                    {pendingToggleId === announcement.announcementId
                      ? "Saving..."
                      : announcement.isActive
                        ? "Deactivate"
                        : "Post"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppLayout>
  );
}
