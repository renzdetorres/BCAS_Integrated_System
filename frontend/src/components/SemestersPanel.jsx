import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api/apiClient.js";
import { createSemester, deleteSemester, getSemesterOverview } from "../api/semestersApi.js";
import { useToast } from "../context/ToastContext.jsx";
import { formatCalendarDate } from "../utils/format.js";
import ConfirmDialog from "./ui/ConfirmDialog.jsx";
import DataTable from "./ui/DataTable.jsx";
import Icon from "./ui/Icon.jsx";
import Modal from "./ui/Modal.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";

function AddSemesterModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({ name: "", startDate: "", endDate: "" });
      setErrorMessage(null);
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setErrorMessage("Fill in the name and both dates.");
      return;
    }
    if (form.endDate < form.startDate) {
      setErrorMessage("The end date must be on or after the start date.");
      return;
    }
    setIsSaving(true);
    try {
      onCreated(await createSemester({ ...form, name: form.name.trim() }));
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to add the semester.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isSaving}
      title="Add semester"
      subtitle="While today falls inside a semester, scholarships can't be edited or deactivated."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="add-semester-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Adding..." : "Add semester"}
          </button>
        </>
      }
    >
      <form id="add-semester-form" onSubmit={handleSubmit} noValidate>
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="ui-field">
          <label className="ui-label" htmlFor="semester-name">
            Name
          </label>
          <input
            id="semester-name"
            className="ui-input"
            data-autofocus
            placeholder="e.g. 1st Semester 2026-2027"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="ui-field-row">
          <div className="ui-field">
            <label className="ui-label" htmlFor="semester-start">
              Starts
            </label>
            <input
              id="semester-start"
              type="date"
              className="ui-input"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="semester-end">
              Ends
            </label>
            <input
              id="semester-end"
              type="date"
              className="ui-input"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** The school calendar the scholarship lock reads. Everyone sees it; only a Super Admin changes it. */
export default function SemestersPanel() {
  const { showToast } = useToast();
  const [overview, setOverview] = useState({ semesters: [], ongoing: null, callerIsSuperAdmin: false });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setOverview(await getSemesterOverview());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load semesters.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmRemove() {
    setIsRemoving(true);
    try {
      await deleteSemester(removeTarget.semesterId);
      showToast(`${removeTarget.name} removed.`);
      setRemoveTarget(null);
      await load();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to remove the semester.", "error");
    } finally {
      setIsRemoving(false);
    }
  }

  const canManage = overview.callerIsSuperAdmin;

  const columns = [
    { key: "name", header: "Semester", sortable: true },
    {
      key: "startDate",
      header: "Starts",
      sortable: true,
      render: (row) => formatCalendarDate(row.startDate),
    },
    {
      key: "endDate",
      header: "Ends",
      sortable: true,
      render: (row) => formatCalendarDate(row.endDate),
    },
    {
      key: "status",
      header: "Scholarships",
      accessor: (row) => (row.isOngoing ? "Locked" : "Editable"),
      render: (row) =>
        row.isOngoing ? <StatusBadge status="Pending" label="Locked now" /> : <span className="ui-cell-muted">Editable</span>,
    },
    ...(canManage
      ? [
          {
            key: "action",
            header: "Action",
            align: "right",
            render: (row) => (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setRemoveTarget(row)}>
                Remove
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        title="Semesters"
        titleAs="h2"
        subtitle={
          canManage
            ? "Scholarships are locked while a semester is in progress. As an Admin with full controls you manage these dates."
            : "Scholarships are locked while a semester is in progress. Only an Admin with full controls can change these dates."
        }
        actions={
          canManage ? (
            <button type="button" className="btn btn-primary" onClick={() => setIsAdding(true)}>
              <Icon name="plus" size={16} />
              Add semester
            </button>
          ) : null
        }
        columns={columns}
        rows={overview.semesters}
        getRowKey={(row) => row.semesterId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage="No semesters yet, so scholarships are never locked."
      />

      <AddSemesterModal
        open={isAdding}
        onClose={() => setIsAdding(false)}
        onCreated={async (created) => {
          setIsAdding(false);
          showToast(`${created.name} added.`);
          await load();
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this semester?"
        message={
          removeTarget
            ? `${removeTarget.name} (${formatCalendarDate(removeTarget.startDate)} to ${formatCalendarDate(removeTarget.endDate)}) will be removed.${removeTarget.isOngoing ? " It's in progress, so scholarships unlock immediately." : ""}`
            : ""
        }
        confirmLabel="Remove"
        isSubmitting={isRemoving}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}
