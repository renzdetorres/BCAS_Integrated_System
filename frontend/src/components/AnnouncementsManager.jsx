import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import { formatDateTime } from "../utils/format.js";
import AppLayout from "./layout/AppLayout.jsx";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import DataTable, { RowAction } from "./ui/DataTable.jsx";
import EmptyState from "./ui/EmptyState.jsx";
import Icon from "./ui/Icon.jsx";
import Modal from "./ui/Modal.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import "./AnnouncementsManager.css";

const CATEGORIES = ["Admission", "Scholarship"];
const BODY_LIMIT = 2000;

function StatusTag({ isActive }) {
  return <StatusBadge status={isActive ? "Published" : "Draft"} label={isActive ? "Posted" : "Draft"} />;
}

function CreateAnnouncementModal({ open, onClose, onCreated, createAnnouncement }) {
  const [form, setForm] = useState({ category: CATEGORIES[0], title: "", body: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({ category: CATEGORIES[0], title: "", body: "" });
      setErrorMessage(null);
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    if (!form.title.trim() || !form.body.trim()) {
      setErrorMessage("A title and a message are required.");
      return;
    }
    setIsSaving(true);
    try {
      await createAnnouncement({ ...form, title: form.title.trim(), body: form.body.trim() });
      onCreated(form.title.trim());
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to create the announcement.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isSaving}
      size="lg"
      title="Create announcement"
      subtitle="It's saved as a draft. Post it from the list when it should be visible to applicants."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="create-announcement-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save draft"}
          </button>
        </>
      }
    >
      <form id="create-announcement-form" onSubmit={handleSubmit} noValidate>
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="ui-field-row">
          <div className="ui-field announcement-category-field">
            <label className="ui-label" htmlFor="announcement-category">
              Category
            </label>
            <select
              id="announcement-category"
              className="ui-select"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="announcement-title">
              Title
            </label>
            <input
              id="announcement-title"
              className="ui-input"
              data-autofocus
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="announcement-body">
            Message
          </label>
          <textarea
            id="announcement-body"
            className="ui-textarea"
            rows={7}
            maxLength={BODY_LIMIT}
            value={form.body}
            onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
          />
          <p className="ui-hint">
            {form.body.length.toLocaleString()} of {BODY_LIMIT.toLocaleString()} characters
          </p>
        </div>
      </form>
    </Modal>
  );
}

function AnnouncementModal({ announcement, isChanging, onToggle, onClose }) {
  return (
    <Modal
      open
      onClose={onClose}
      busy={isChanging}
      size="lg"
      title={announcement.title}
      subtitle={`${announcement.category} announcement · ${formatDateTime(announcement.postedAt)}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isChanging}>
            Close
          </button>
          <button
            type="button"
            className={announcement.isActive ? "btn btn-danger" : "btn btn-primary"}
            onClick={() => onToggle(announcement)}
            disabled={isChanging}
          >
            {announcement.isActive ? "Deactivate" : "Post to applicants"}
          </button>
        </>
      }
    >
      <div className="announcement-view-status">
        <StatusTag isActive={announcement.isActive} />
        <span>{announcement.isActive ? "Visible to applicants" : "Not visible to applicants"}</span>
      </div>
      <p className="announcement-view-body">{announcement.body}</p>
    </Modal>
  );
}

/**
 * Announcement management shared by the Admin-Registrar and (when
 * authorized) the Academic Head: a DataTable of every announcement,
 * "Create announcement" in a modal, and a detail modal to read, post or
 * deactivate one. The two roles differ only in which API they call.
 */
export default function AnnouncementsManager({ api, subtitle }) {
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [changingId, setChangingId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setAnnouncements(await api.listAnnouncements());
      setLoadError(null);
      setIsForbidden(false);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load announcements.");
      setIsForbidden(error instanceof ApiError && error.status === 403);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function setActive(announcement, isActive) {
    setChangingId(announcement.announcementId);
    try {
      const updated = await api.setAnnouncementActiveStatus(announcement.announcementId, isActive);
      setAnnouncements((prev) => prev.map((a) => (a.announcementId === updated.announcementId ? updated : a)));
      setViewing((current) => (current && current.announcementId === updated.announcementId ? updated : current));
      showToast(`"${updated.title}" was ${updated.isActive ? "posted" : "deactivated"}.`);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to update the announcement.", "error");
    } finally {
      setChangingId(null);
      setDeactivateTarget(null);
    }
  }

  function handleToggle(announcement) {
    if (announcement.isActive) {
      setDeactivateTarget(announcement);
    } else {
      setActive(announcement, true);
    }
  }

  const rows = useMemo(
    () =>
      announcements.filter(
        (a) =>
          (!categoryFilter || a.category === categoryFilter) &&
          (!statusFilter || (statusFilter === "posted" ? a.isActive : !a.isActive)),
      ),
    [announcements, categoryFilter, statusFilter],
  );

  if (isForbidden) {
    return (
      <AppLayout>
        <section className="ui-datatable announcement-forbidden">
          <EmptyState icon="lock" title="Announcements aren't enabled for your role" message={loadError} />
        </section>
      </AppLayout>
    );
  }

  const columns = [
    {
      key: "title",
      header: "Announcement",
      accessor: (row) => `${row.title} ${row.body}`,
      sortable: true,
      render: (row) => (
        <span className="announcement-cell">
          <span className="announcement-cell-title">{row.title}</span>
          <span className="announcement-cell-body">{row.body}</span>
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      render: (row) => (
        <span className={`announcement-category category-${row.category.toLowerCase()}`}>{row.category}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => (row.isActive ? "Posted" : "Draft"),
      sortable: true,
      render: (row) => <StatusTag isActive={row.isActive} />,
    },
    {
      key: "postedAt",
      header: "Created",
      sortable: true,
      searchable: false,
      render: (row) => formatDateTime(row.postedAt),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      searchable: false,
      render: (row) => (
        <RowAction label="View details" onClick={() => setViewing(row)} ariaLabel={`View "${row.title}"`} />
      ),
    },
  ];

  const postedCount = announcements.filter((a) => a.isActive).length;

  return (
    <AppLayout>
      <DataTable
        title="Announcements"
        subtitle={subtitle}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setIsCreating(true)}>
            <Icon name="plus" size={16} />
            Create announcement
          </button>
        }
        summary={[
          { label: "Posted", value: postedCount.toLocaleString(), tone: "green" },
          { label: "Drafts", value: (announcements.length - postedCount).toLocaleString() },
          { label: "Total", value: announcements.length.toLocaleString() },
        ]}
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.announcementId}
        isLoading={isLoading}
        errorMessage={loadError}
        emptyMessage={announcements.length === 0 ? "No announcements yet. Create the first one." : "No announcements match these filters."}
        onRowClick={(row) => setViewing(row)}
        searchPlaceholder="Search titles and messages"
        filters={[
          {
            key: "category",
            label: "All categories",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: CATEGORIES.map((c) => ({ value: c, label: c })),
          },
          {
            key: "status",
            label: "Any status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "posted", label: "Posted" },
              { value: "draft", label: "Draft" },
            ],
          },
        ]}
      />

      <CreateAnnouncementModal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        createAnnouncement={api.createAnnouncement}
        onCreated={async (title) => {
          setIsCreating(false);
          showToast(`"${title}" saved as a draft.`);
          await load();
        }}
      />

      {viewing ? (
        <AnnouncementModal
          announcement={viewing}
          isChanging={changingId === viewing.announcementId}
          onToggle={handleToggle}
          onClose={() => setViewing(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Deactivate this announcement?"
        message={
          deactivateTarget
            ? `"${deactivateTarget.title}" will stop showing to applicants. It isn't deleted; you can post it again later.`
            : ""
        }
        confirmLabel="Deactivate"
        isSubmitting={changingId === deactivateTarget?.announcementId}
        onConfirm={() => setActive(deactivateTarget, false)}
        onCancel={() => setDeactivateTarget(null)}
      />
    </AppLayout>
  );
}
