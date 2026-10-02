import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createScholarship,
  listScholarships,
  setScholarshipActiveStatus,
  updateScholarship,
} from "../api/adminScholarshipsApi.js";
import { ApiError } from "../api/apiClient.js";
import { getSemesterOverview } from "../api/semestersApi.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import DataTable, { PersonCell, RowAction } from "../components/ui/DataTable.jsx";
import Icon from "../components/ui/Icon.jsx";
import Modal from "../components/ui/Modal.jsx";
import Notice from "../components/ui/Notice.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCalendarDate } from "../utils/format.js";
import "./AdminScholarshipsPage.css";

const emptyForm = { name: "", scholarshipType: "", totalSlots: "", minimumGradeAverage: "" };

function toForm(scholarship) {
  return {
    name: scholarship.name,
    scholarshipType: scholarship.scholarshipType,
    totalSlots: String(scholarship.totalSlots),
    minimumGradeAverage: scholarship.minimumGradeAverage == null ? "" : String(scholarship.minimumGradeAverage),
  };
}

function toRequestBody(form) {
  return {
    name: form.name.trim(),
    scholarshipType: form.scholarshipType.trim(),
    totalSlots: Number(form.totalSlots),
    minimumGradeAverage: form.minimumGradeAverage.trim() === "" ? null : Number(form.minimumGradeAverage),
  };
}

function semesterRange(semester) {
  return `${formatCalendarDate(semester.startDate)} to ${formatCalendarDate(semester.endDate)}`;
}

/**
 * Add and edit share one form. Editing during an ongoing semester is only
 * reachable by a Super Admin, and asks them to confirm the override first.
 */
function ScholarshipFormModal({ mode, scholarship, lockedBy, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const isForced = isEdit && Boolean(lockedBy);
  const [form, setForm] = useState(isEdit ? toForm(scholarship) : emptyForm);
  const [confirmedOverride, setConfirmedOverride] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    if (!form.name.trim() || !form.scholarshipType.trim() || !form.totalSlots) {
      setErrorMessage("Name, type and total slots are required.");
      return;
    }
    if (isForced && !confirmedOverride) {
      setErrorMessage("Confirm the override to save during the semester.");
      return;
    }
    setIsSaving(true);
    try {
      const saved = isEdit
        ? await updateScholarship(scholarship.scholarshipId, toRequestBody(form), { force: isForced })
        : await createScholarship(toRequestBody(form));
      onSaved(saved, isEdit);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to save the scholarship.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSaving}
      title={isEdit ? `Edit ${scholarship.name}` : "Add scholarship"}
      subtitle={isEdit ? null : "Remaining slots start equal to total slots."}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="submit"
            form="scholarship-form"
            className={isForced ? "btn btn-danger-solid" : "btn btn-primary"}
            disabled={isSaving || (isForced && !confirmedOverride)}
          >
            {isSaving ? "Saving..." : isForced ? "Force save" : isEdit ? "Save changes" : "Add scholarship"}
          </button>
        </>
      }
    >
      <form id="scholarship-form" onSubmit={handleSubmit} noValidate>
        {isForced ? (
          <div className="scholarship-override">
            <Notice tone="warning" title={`${lockedBy.name} is in progress`}>
              <p>
                Scholarships are locked until {formatCalendarDate(lockedBy.endDate)}. Saving now overrides the lock
                as a Super Admin and is recorded in the Activity Log.
              </p>
            </Notice>
            <label className="scholarship-override-confirm">
              <input type="checkbox" checked={confirmedOverride} onChange={(e) => setConfirmedOverride(e.target.checked)} />
              I understand this changes the scholarship mid-semester.
            </label>
          </div>
        ) : null}
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="ui-field">
          <label className="ui-label" htmlFor="scholarship-name">
            Name
          </label>
          <input
            id="scholarship-name"
            className="ui-input"
            required
            data-autofocus
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="scholarship-type">
            Type
          </label>
          <input
            id="scholarship-type"
            className="ui-input"
            required
            placeholder="e.g. Academic, Athletic, Financial Aid"
            value={form.scholarshipType}
            onChange={(e) => setField("scholarshipType", e.target.value)}
          />
        </div>
        <div className="ui-field-row">
          <div className="ui-field">
            <label className="ui-label" htmlFor="scholarship-slots">
              Total slots
            </label>
            <input
              id="scholarship-slots"
              type="number"
              min="1"
              className="ui-input"
              required
              value={form.totalSlots}
              onChange={(e) => setField("totalSlots", e.target.value)}
            />
            {isEdit && scholarship.occupiedSlots > 0 ? (
              <p className="ui-hint">At least {scholarship.occupiedSlots}, the slots already filled.</p>
            ) : null}
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="scholarship-grade">
              Minimum grade average
            </label>
            <input
              id="scholarship-grade"
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="ui-input"
              placeholder="Optional"
              value={form.minimumGradeAverage}
              onChange={(e) => setField("minimumGradeAverage", e.target.value)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminScholarshipsPage() {
  const { showToast } = useToast();
  const [scholarships, setScholarships] = useState([]);
  const [overview, setOverview] = useState({ ongoing: null, callerIsSuperAdmin: false });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formState, setFormState] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, semesterOverview] = await Promise.all([listScholarships(), getSemesterOverview()]);
      setScholarships(list);
      setOverview(semesterOverview);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load scholarships.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const locked = overview.ongoing;
  const canOverride = Boolean(locked) && overview.callerIsSuperAdmin;
  const editBlocked = Boolean(locked) && !overview.callerIsSuperAdmin;

  async function changeStatus(scholarship, isActive) {
    setIsChangingStatus(true);
    try {
      const updated = await setScholarshipActiveStatus(scholarship.scholarshipId, isActive, {
        force: !isActive && canOverride,
      });
      setScholarships((prev) => prev.map((s) => (s.scholarshipId === updated.scholarshipId ? updated : s)));
      showToast(`"${updated.name}" ${updated.isActive ? "activated" : "deactivated"}.`);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to update the scholarship.", "error");
    } finally {
      setIsChangingStatus(false);
      setStatusTarget(null);
    }
  }

  const types = useMemo(() => [...new Set(scholarships.map((s) => s.scholarshipType))].sort(), [scholarships]);
  const rows = useMemo(
    () =>
      scholarships.filter(
        (s) =>
          (!statusFilter || (statusFilter === "active" ? s.isActive : !s.isActive)) &&
          (!typeFilter || s.scholarshipType === typeFilter),
      ),
    [scholarships, statusFilter, typeFilter],
  );

  const active = scholarships.filter((s) => s.isActive);
  const totalSlots = active.reduce((sum, s) => sum + s.totalSlots, 0);
  const remainingSlots = active.reduce((sum, s) => sum + s.remainingSlots, 0);

  const lockedTitle = locked ? `Locked during ${locked.name}` : "";

  const columns = [
    {
      key: "name",
      header: "Scholarship",
      accessor: (row) => `${row.name} ${row.scholarshipType}`,
      sortable: true,
      render: (row) => <PersonCell name={row.name} detail={row.scholarshipType} />,
    },
    {
      key: "slots",
      header: "Slots filled",
      accessor: (row) => (row.totalSlots > 0 ? row.occupiedSlots / row.totalSlots : 0),
      sortable: true,
      searchable: false,
      render: (row) => (
        <span className="scholarship-slots">
          <span className="scholarship-slots-text">
            <strong>{row.occupiedSlots}</strong> of {row.totalSlots}
          </span>
          <span className="scholarship-slots-bar" aria-hidden="true">
            <span style={{ width: `${row.totalSlots > 0 ? (row.occupiedSlots / row.totalSlots) * 100 : 0}%` }} />
          </span>
        </span>
      ),
    },
    {
      key: "remainingSlots",
      header: "Remaining",
      align: "right",
      sortable: true,
      searchable: false,
    },
    {
      key: "minimumGradeAverage",
      header: "Min. grade",
      align: "right",
      accessor: (row) => row.minimumGradeAverage ?? -1,
      sortable: true,
      searchable: false,
      render: (row) => row.minimumGradeAverage ?? <span className="ui-cell-muted">None</span>,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => (row.isActive ? "Active" : "Inactive"),
      sortable: true,
      render: (row) => <StatusBadge status={row.isActive ? "Active" : "Inactive"} />,
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      searchable: false,
      render: (row) => (
        <span className="scholarship-actions">
          <RowAction
            label={canOverride ? "Force edit" : "Edit"}
            icon={locked ? "lock" : "settings"}
            onClick={() => setFormState({ mode: "edit", scholarship: row })}
            disabled={editBlocked}
            title={editBlocked ? `${lockedTitle}. Only a Super Admin can edit now.` : undefined}
            ariaLabel={`Edit ${row.name}`}
          />
          {row.isActive ? (
            <button
              type="button"
              className="scholarship-status-button"
              disabled={editBlocked}
              title={editBlocked ? `${lockedTitle}. Only a Super Admin can deactivate now.` : undefined}
              onClick={(event) => {
                event.stopPropagation();
                setStatusTarget(row);
              }}
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              className="scholarship-status-button"
              onClick={(event) => {
                event.stopPropagation();
                changeStatus(row, true);
              }}
            >
              Activate
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Scholarships"
        subtitle="The scholarships applicants can apply to, with their slots. A deactivated scholarship stops appearing to applicants and can't be applied to."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormState({ mode: "add" })}>
            <Icon name="plus" size={16} />
            Add scholarship
          </button>
        }
        notice={
          locked ? (
            <Notice tone="warning" title={`${locked.name} is in progress (${semesterRange(locked)})`}>
              <p>
                {overview.callerIsSuperAdmin
                  ? "Scholarships can't be edited or deactivated until it ends. As a Super Admin you can force a change; it's recorded in the Activity Log."
                  : "Scholarships can't be edited or deactivated until it ends. You can still add new scholarships. Ask a Super Admin if a change can't wait."}
              </p>
            </Notice>
          ) : null
        }
        summary={[
          { label: "Active scholarships", value: active.length.toLocaleString() },
          { label: "Total slots", value: totalSlots.toLocaleString() },
          { label: "Slots remaining", value: remainingSlots.toLocaleString(), tone: "green" },
          { label: "Slots filled", value: (totalSlots - remainingSlots).toLocaleString() },
        ]}
        summaryNote="Slot figures count active scholarships only."
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.scholarshipId}
        isLoading={isLoading}
        errorMessage={loadError}
        emptyMessage={scholarships.length === 0 ? "No scholarships yet. Add the first one." : "No scholarships match these filters."}
        searchPlaceholder="Search by name or type"
        filters={[
          {
            key: "status",
            label: "Any status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
          {
            key: "type",
            label: "All types",
            value: typeFilter,
            onChange: setTypeFilter,
            options: types.map((type) => ({ value: type, label: type })),
          },
        ]}
      />

      {formState ? (
        <ScholarshipFormModal
          mode={formState.mode}
          scholarship={formState.scholarship}
          lockedBy={locked}
          onClose={() => setFormState(null)}
          onSaved={(saved, isEdit) => {
            setFormState(null);
            if (isEdit) {
              setScholarships((prev) => prev.map((s) => (s.scholarshipId === saved.scholarshipId ? saved : s)));
            } else {
              setScholarships((prev) => [saved, ...prev]);
            }
            showToast(`"${saved.name}" ${isEdit ? "updated" : "added"}.`);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={canOverride ? "Force deactivate during the semester?" : "Deactivate this scholarship?"}
        message={
          statusTarget
            ? `"${statusTarget.name}" will stop appearing to applicants and can no longer be applied to.` +
              (canOverride ? ` ${locked.name} is in progress; this overrides the lock and is recorded in the Activity Log.` : "")
            : ""
        }
        confirmLabel={canOverride ? "Force deactivate" : "Deactivate"}
        isSubmitting={isChangingStatus}
        onConfirm={() => changeStatus(statusTarget, false)}
        onCancel={() => setStatusTarget(null)}
      />
    </AppLayout>
  );
}
