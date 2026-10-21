import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ALL_ROLES,
  DEPARTMENT_OPTIONS,
  STAFF_ROLES,
  deleteUser,
  listUsers,
  provisionStaff,
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
import AccountsWorkspace from "../components/accounts/AccountsWorkspace.jsx";
import Icon from "../components/ui/Icon.jsx";
import Modal from "../components/ui/Modal.jsx";
import "./ManageUsersPage.css";

function roleLabel(role) {
  return ROLE_SHORT_LABELS[role] ?? role;
}

function fullName(user) {
  return `${user.firstName} ${user.lastName}`;
}

const ROLE_HINTS = {
  Evaluator: "Screens scholarship applications and records verdicts.",
  SupportStaff: "Verifies applicants' documents and answers inquiries.",
  AcademicHead: "Makes final scholarship decisions for one department.",
  Admin: "Full access, including accounts and settings.",
};

const EMPTY_STAFF_FORM = { firstName: "", lastName: "", email: "", password: "", role: STAFF_ROLES[0], department: "" };

/** Staff accounts are created here; applicants never are - they self-register. */
function AddStaffModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_STAFF_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setErrorMessage("Name and email are required.");
      return;
    }
    if (form.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (form.role === "AcademicHead" && !form.department) {
      setErrorMessage("Assign the Academic Head to a department.");
      return;
    }
    setIsSaving(true);
    try {
      onCreated(await provisionStaff(form));
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSaving}
      title="Add a staff account"
      subtitle="Applicants are never added here - they register themselves."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="add-staff-form" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? "Creating account..." : "Create account"}
          </button>
        </>
      }
    >
      <form id="add-staff-form" onSubmit={handleSubmit} noValidate autoComplete="off">
        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="ui-field-row">
          <div className="ui-field">
            <label className="ui-label" htmlFor="add-first-name">
              First name
            </label>
            <input placeholder="e.g. Juan" id="add-first-name" className="ui-input" data-autofocus value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} />
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="add-last-name">
              Last name
            </label>
            <input placeholder="e.g. Dela Cruz" id="add-last-name" className="ui-input" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} />
          </div>
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="add-email">
            Email
          </label>
          <input placeholder="e.g. juan.delacruz@email.com" id="add-email" type="email" autoComplete="off" className="ui-input" value={form.email} onChange={(e) => setField("email", e.target.value)} />
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="add-password">
            Temporary password
          </label>
          <input placeholder="At least 8 characters" id="add-password" type="password" autoComplete="new-password" className="ui-input" value={form.password} onChange={(e) => setField("password", e.target.value)} />
          <p className="ui-hint">They can sign in with it right away.</p>
        </div>
        <div className="ui-field-row">
          <div className="ui-field">
            <label className="ui-label" htmlFor="add-role">
              Role
            </label>
            <select id="add-role" className="ui-select" value={form.role} onChange={(e) => setField("role", e.target.value)}>
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
            <p className="ui-hint">{ROLE_HINTS[form.role]}</p>
          </div>
          {form.role === "AcademicHead" ? (
            <div className="ui-field">
              <label className="ui-label" htmlFor="add-department">
                Assigned department
              </label>
              <select id="add-department" className="ui-select" value={form.department} onChange={(e) => setField("department", e.target.value)}>
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
      </form>
    </Modal>
  );
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
            <input placeholder="e.g. Juan"
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
            <input placeholder="e.g. Dela Cruz" id="edit-last-name" className="ui-input" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} />
          </div>
        </div>
        <div className="ui-field">
          <label className="ui-label" htmlFor="edit-email">
            Email
          </label>
          <input placeholder="e.g. juan.delacruz@email.com" id="edit-email" type="email" className="ui-input" value={form.email} onChange={(e) => setField("email", e.target.value)} />
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
  const [searchParams, setSearchParams] = useSearchParams();
  // The dashboard shortcut links here with ?new=1 to open the form straight away.
  const [adding, setAdding] = useState(searchParams.get("new") === "1");
  const [bulk, setBulk] = useState(null); // { users, isActive } waiting for a confirmation or running
  const [isBulkRunning, setIsBulkRunning] = useState(false);

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

  useEffect(() => {
    if (searchParams.has("new")) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

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

  /** Activates or deactivates several accounts one after another, then says how many worked. */
  async function changeStatusMany(list, isActive) {
    setIsBulkRunning(true);
    let done = 0;
    let firstProblem = null;
    for (const user of list) {
      try {
        const updated = await setUserActiveStatus(user.userId, isActive);
        setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)));
        done += 1;
      } catch (error) {
        firstProblem ??= error instanceof ApiError ? error.message : "Something went wrong.";
      }
    }
    setIsBulkRunning(false);
    setBulk(null);
    const verb = isActive ? "activated" : "deactivated";
    if (firstProblem) showToast(`${done} of ${list.length} accounts were ${verb}. ${firstProblem}`, "error");
    else showToast(`${done} ${done === 1 ? "account was" : "accounts were"} ${verb}.`);
  }

  return (
    <AppLayout
      title="Account Management"
      actions={
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="user-plus" size={16} />
          Add staff account
        </button>
      }
    >
      <p className="accounts-subtitle">
        Every account in the system. Add a staff account, edit a name, email or role, or deactivate an account to block sign-in without deleting it or its records.
      </p>

      <AccountsWorkspace
        users={users}
        isLoading={isLoading}
        errorMessage={errorMessage}
        currentUserId={session.userId}
        canDelete={callerIsSuperAdmin}
        pendingUserId={pendingUserId}
        onEdit={setEditing}
        onDeactivate={setDeactivateTarget}
        onActivate={(user) => changeStatus(user, true)}
        onDelete={setDeleteTarget}
        onBulkStatus={(list, isActive) => (isActive ? changeStatusMany(list, true) : setBulk({ users: list, isActive: false }))}
      />

      {adding ? (
        <AddStaffModal
          onClose={() => setAdding(false)}
          onCreated={(created) => {
            setUsers((prev) => [created, ...prev]);
            setAdding(false);
            showToast(`${fullName(created)}'s ${roleLabel(created.role)} account was created. They can sign in now.`);
          }}
        />
      ) : null}

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

      <ConfirmDialog
        open={Boolean(bulk)}
        title={bulk ? `Deactivate ${bulk.users.length} ${bulk.users.length === 1 ? "account" : "accounts"}?` : ""}
        message="None of them will be able to sign in. Their records stay, and you can reactivate them at any time."
        confirmLabel="Deactivate"
        isSubmitting={isBulkRunning}
        onConfirm={() => changeStatusMany(bulk.users, false)}
        onCancel={() => setBulk(null)}
      />
    </AppLayout>
  );
}
