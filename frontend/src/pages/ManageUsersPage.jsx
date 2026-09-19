import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, UserCheck, UserX } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import Modal from "../components/ui/Modal.jsx";
import { inputClasses, labelClasses, primaryButtonClasses } from "../lib/formStyles.js";
import { listUsers, provisionStaff, setUserActiveStatus, STAFF_ROLES } from "../api/adminApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";

const MANAGED_ROLES = ["Evaluator", "SupportStaff"];
const ROLE_LABELS = { Evaluator: "Evaluator", SupportStaff: "Support Staff" };

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function initialsOf(firstName, lastName) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

const initialCreateForm = { firstName: "", lastName: "", email: "", password: "", role: STAFF_ROLES[0] };

export default function ManageUsersPage() {
  const { session } = useSession();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createError, setCreateError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listUsers();
      setUsers(data.filter((u) => MANAGED_ROLES.includes(u.role)));
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

  const activeCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);
  const inactiveCount = users.length - activeCount;

  async function handleToggle(user) {
    setPendingUserId(user.userId);
    setErrorMessage(null);
    try {
      const updated = await setUserActiveStatus(user.userId, !user.isActive);
      setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)));
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to update account status.");
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError(null);

    if (createForm.password.length < 8) {
      setCreateError("Password must be at least 8 characters long.");
      return;
    }

    setIsCreating(true);
    try {
      await provisionStaff(createForm);
      setCreateForm(initialCreateForm);
      setCreateOpen(false);
      loadUsers();
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">
            {initialsOf(row.firstName, row.lastName)}
          </span>
          <span className="font-semibold text-slate-800">
            {row.firstName} {row.lastName}
          </span>
        </div>
      ),
    },
    { key: "email", header: "Email", render: (row) => row.email },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <span className="inline-flex rounded-full bg-status-blueBg px-3 py-1 text-xs font-semibold text-status-blue">
          {ROLE_LABELS[row.role]}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.isActive ? "Active" : "Inactive"} />,
    },
    { key: "created", header: "Created", render: (row) => formatDate(row.createdAt) },
    {
      key: "action",
      header: "",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleToggle(row)}
          disabled={pendingUserId === row.userId || row.userId === session.userId}
          className={`font-semibold hover:underline disabled:opacity-40 ${
            row.isActive ? "text-status-red" : "text-status-green"
          }`}
        >
          {pendingUserId === row.userId ? "Saving..." : row.isActive ? "Deactivate" : "Activate"}
        </button>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Account Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage Evaluator and Support Staff accounts.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark"
        >
          + Create Account
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total Staff" value={users.length} />
        <StatCard icon={UserCheck} label="Active" value={activeCount} />
        <StatCard icon={UserX} label="Inactive" value={inactiveCount} />
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(row) => row.userId}
          isLoading={isLoading}
          emptyMessage="No staff accounts yet."
        />
      </div>

      {isCreateOpen && (
        <Modal title="Create Account" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses} htmlFor="firstName">
                  First name
                </label>
                <input
                  id="firstName"
                  className={inputClasses}
                  required
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClasses} htmlFor="lastName">
                  Last name
                </label>
                <input
                  id="lastName"
                  className={inputClasses}
                  required
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className={labelClasses} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={inputClasses}
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="password">
                Temporary password
              </label>
              <input
                id="password"
                type="password"
                minLength={8}
                className={inputClasses}
                required
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="role">
                Role
              </label>
              <select
                id="role"
                className={inputClasses}
                value={createForm.role}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role] ?? role}
                  </option>
                ))}
              </select>
            </div>

            {createError && (
              <p className="text-sm font-medium text-status-red" role="alert">
                {createError}
              </p>
            )}

            <button type="submit" disabled={isCreating} className={`${primaryButtonClasses} w-full`}>
              {isCreating ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
