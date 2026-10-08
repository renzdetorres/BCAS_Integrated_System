import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ALL_ROLES,
  DEPARTMENT_OPTIONS,
  deleteUser,
  listUsers,
  setUserActiveStatus,
  setUserSuperAdmin,
  updateUser,
} from "../api/adminApi.js";
import { ApiError } from "../api/apiClient.js";
import { ROLE_SHORT_LABELS } from "../config/navigation.js";
import { useSession } from "../context/SessionContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import ConfirmDialog from "../components/ui/ConfirmDialog.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import Icon from "../components/ui/Icon.jsx";
import Modal from "../components/ui/Modal.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./ManageUsersPage.css";

function roleLabel(role) {
  return ROLE_SHORT_LABELS[role] ?? role;
}

function fullName(user) {
  return `${user.firstName} ${user.lastName}`;
}

function initials(user) {
  return `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
}

function EditAccountModal({ user, isSelf, callerIsSuperAdmin, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    department: user.department ?? "",
    isSuperAdmin: user.isSuperAdmin,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const showSuperAdmin = callerIsSuperAdmin && form.role === "Admin" && user.role === "Admin";

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setErrorMessage("Name and email are required.");
      return;
    }
    if (form.role === "AcademicHead" && !form.department) {
      setErrorMessage("Assign the Academic Head to a department.");
      return;
    }
    setIsSaving(true);
    try {
      let updated = await updateUser(user.userId, form);
      if (showSuperAdmin && form.isSuperAdmin !== user.isSuperAdmin) {
        updated = await setUserSuperAdmin(user.userId, form.isSuperAdmin);
      }
      onSaved(updated);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to update the account.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSaving}
      title={`Edit ${fullName(user)}`}
      subtitle={user.email}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="edit-account-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </>
      }
    >
      <form id="edit-account-form" onSubmit={handleSubmit} noValidate>
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="ui-field-row">
          <div className="ui-field">
            <label className="ui-label" htmlFor="edit-first-name">
              First name
            </label>
            <input
              id="edit-first-name"
              className="ui-input"
              data-autofocus
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
            />
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="edit-last-name">
              Last name
            </label>
            <input id="edit-last-name" className="ui-input" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} />
          </div>
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="edit-email">
            Email
          </label>
          <input id="edit-email" type="email" className="ui-input" value={form.email} onChange={(e) => setField("email", e.target.value)} />
        </div>
        <div className="ui-field-row">
          <div className="ui-field">
            <label className="ui-label" htmlFor="edit-role">
              Role
            </label>
            <select
              id="edit-role"
              className="ui-select"
              value={form.role}
              disabled={isSelf}
              onChange={(e) => setField("role", e.target.value)}
            >
              {ALL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            {isSelf ? <p className="ui-hint">You can't change your own role.</p> : null}
          </div>
          {form.role === "AcademicHead" ? (
            <div className="ui-field">
              <label className="ui-label" htmlFor="edit-department">
                Assigned department
              </label>
              <select
                id="edit-department"
                className="ui-select"
                value={form.department}
                onChange={(e) => setField("department", e.target.value)}
              >
                <option value="" disabled>
                  Select a department
                </option>
                {DEPARTMENT_OPTIONS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <p className="ui-hint">They only see applicants in this department.</p>
            </div>
          ) : null}
        </div>
        {showSuperAdmin ? (
          <label className="account-super-admin">
            <input
              type="checkbox"
              checked={form.isSuperAdmin}
              onChange={(e) => setField("isSuperAdmin", e.target.checked)}
            />
            <span>
              Full controls
              <small>Can force-edit scholarships during a semester, manage semesters, set what each role can access, and give other Admins full controls.</small>
            </span>
          </label>
        ) : null}
      </form>
    </Modal>
  );
}

export default function ManageUsersPage() {
  const { session } = useSession();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listUsers();
      setUsers(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load accounts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const callerIsSuperAdmin = users.find((u) => u.userId === session.userId)?.isSuperAdmin ?? false;

  async function changeStatus(user, isActive) {
    setPendingUserId(user.userId);
    try {
      const updated = await setUserActiveStatus(user.userId, isActive);
      setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)));
      showToast(`${fullName(user)}'s account was ${updated.isActive ? "activated" : "deactivated"}.`);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to update the account.", "error");
    } finally {
      setPendingUserId(null);
      setDeactivateTarget(null);
    }
  }

  async function confirmDelete() {
    const target = deleteTarget;
    setIsDeleting(true);
    try {
      await deleteUser(target.userId);
      setUsers((prev) => prev.filter((u) => u.userId !== target.userId));
      showToast(`${fullName(target)}'s account was deleted.`);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Failed to delete the account.", "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  const rows = useMemo(
    () =>
      users.filter(
        (u) =>
          (!roleFilter || u.role === roleFilter) &&
          (!statusFilter || (statusFilter === "active" ? u.isActive : !u.isActive)),
      ),
    [users, roleFilter, statusFilter],
  );

  const activeCount = users.filter((u) => u.isActive).length;
  const deactivatedCount = users.length - activeCount;
  const unassignedHeads = users.filter((u) => u.role === "AcademicHead" && !u.department).length;

  const columns = [
    {
      key: "name",
      header: "Account",
      accessor: (row) => `${fullName(row)} ${row.email}`,
      sortable: true,
      render: (row) => (
        <span className="account-cell">
          <span className={`account-avatar${row.isActive ? "" : " account-avatar-off"}`} aria-hidden="true">
            {initials(row)}
          </span>
          <span className="account-cell-text">
            <span className="account-name">
              {fullName(row)}
              {row.userId === session.userId ? <span className="account-you">You</span> : null}
            </span>
            <span className="account-email">{row.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      accessor: (row) => roleLabel(row.role),
      sortable: true,
      render: (row) => (
        <span className="account-role">
          <span className="account-role-chip">{roleLabel(row.role)}</span>
          {row.isSuperAdmin ? <span className="account-super-tag">Full controls</span> : null}
        </span>
      ),
    },
    {
      key: "department",
      header: "Department",
      accessor: (row) => row.department ?? "",
      sortable: true,
      render: (row) =>
        row.role === "AcademicHead" && !row.department ? (
          <span className="department-missing" title="This Academic Head sees no applicants until a department is assigned">
            Not assigned
          </span>
        ) : (
          row.department ?? <span className="ui-cell-muted">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => (row.isActive ? "Active" : "Deactivated"),
      sortable: true,
      render: (row) => <StatusBadge status={row.isActive ? "Active" : "Inactive"} label={row.isActive ? "Active" : "Deactivated"} />,
    },
    {
      key: "action",
      header: "Actions",
      align: "right",
      searchable: false,
      render: (row) => {
        const isSelf = row.userId === session.userId;
        const isPending = pendingUserId === row.userId;
        return (
          <span className={`account-actions${callerIsSuperAdmin ? " account-actions-3" : ""}`}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(row)} aria-label={`Edit ${fullName(row)}`}>
              <Icon name="settings" size={15} />
              Edit
            </button>
            {row.isActive ? (
              <button
                type="button"
                className="btn btn-warning btn-sm"
                disabled={isSelf || isPending}
                title={isSelf ? "You can't change your own account's status" : undefined}
                aria-label={`Deactivate ${fullName(row)}`}
                onClick={() => setDeactivateTarget(row)}
              >
                <Icon name="lock" size={15} />
                {isPending ? "Saving..." : "Deactivate"}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-success btn-sm"
                disabled={isPending}
                aria-label={`Activate ${fullName(row)}`}
                onClick={() => changeStatus(row, true)}
              >
                <Icon name="check" size={15} />
                {isPending ? "Saving..." : "Activate"}
              </button>
            )}
            {callerIsSuperAdmin ? (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={isSelf || isDeleting}
                title={isSelf ? "You can't delete your own account" : undefined}
                onClick={() => setDeleteTarget(row)}
                aria-label={`Delete ${fullName(row)}`}
              >
                <Icon name="trash" size={15} />
                Delete
              </button>
            ) : null}
          </span>
        );
      },
    },
  ];

  return (
    <AppLayout>
      <DataTable
        title="Account Management"
        subtitle="Every account in the system. Edit a name, email or role, or deactivate an account to block sign-in without deleting it or its records."
        summary={[
          { label: "Accounts", value: users.length.toLocaleString(), active: !roleFilter && !statusFilter, onClick: () => { setRoleFilter(""); setStatusFilter(""); } },
          { label: "Active", value: activeCount.toLocaleString(), tone: "green", active: statusFilter === "active", onClick: () => setStatusFilter(statusFilter === "active" ? "" : "active") },
          { label: "Deactivated", value: deactivatedCount.toLocaleString(), tone: "amber", active: statusFilter === "inactive", onClick: () => setStatusFilter(statusFilter === "inactive" ? "" : "inactive") },
          ...(unassignedHeads > 0 ? [{ label: "Academic Heads without a department", value: unassignedHeads.toLocaleString(), tone: "red" }] : []),
        ]}
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.userId}
        isLoading={isLoading}
        errorMessage={errorMessage}
        emptyMessage={users.length === 0 ? "No accounts yet." : "No accounts match these filters."}
        filters={[
          {
            key: "role",
            label: "All roles",
            value: roleFilter,
            onChange: setRoleFilter,
            options: ALL_ROLES.map((role) => ({ value: role, label: roleLabel(role) })),
          },
          {
            key: "status",
            label: "Any status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Deactivated" },
            ],
          },
        ]}
        searchPlaceholder="Search by name or email"
      />

      {editing ? (
        <EditAccountModal
          user={editing}
          isSelf={editing.userId === session.userId}
          callerIsSuperAdmin={callerIsSuperAdmin}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)));
            setEditing(null);
            showToast(`${fullName(updated)}'s account was updated.`);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Deactivate this account?"
        message={
          deactivateTarget
            ? `${fullName(deactivateTarget)} (${deactivateTarget.email}) won't be able to sign in. Their records stay, and you can reactivate the account at any time.`
            : ""
        }
        confirmLabel="Deactivate"
        isSubmitting={pendingUserId === deactivateTarget?.userId}
        onConfirm={() => changeStatus(deactivateTarget, false)}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this account permanently?"
        message={
          deleteTarget
            ? `${fullName(deleteTarget)} (${deleteTarget.email}) and everything tied to the account - applications, documents, exam records and inquiries - will be deleted. This can't be undone. To only block sign-in, deactivate the account instead.`
            : ""
        }
        confirmLabel="Delete account"
        isSubmitting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
