import { useCallback, useEffect, useState } from "react";
import { ALL_ROLES, listUsers, setUserActiveStatus, updateUser } from "../api/adminApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./ManageUsersPage.css";

const emptyEditForm = { firstName: "", lastName: "", email: "", role: ALL_ROLES[0], department: "" };

export default function ManageUsersPage() {
  const { session } = useSession();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [isSaving, setIsSaving] = useState(false);

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

  function startEdit(user) {
    setErrorMessage(null);
    setEditingUserId(user.userId);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department ?? "",
    });
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditForm(emptyEditForm);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleEditSave(userId) {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updated = await updateUser(userId, editForm);
      setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)));
      setEditingUserId(null);
      setEditForm(emptyEditForm);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to update account.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppLayout title="Account Management">
      <Card>
        <p className="manage-users-subtitle">
          Edit an account's name, email, or role, or deactivate it to block login without deleting it or
          any linked records.
        </p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <table className="manage-users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) =>
                editingUserId === user.userId ? (
                  <tr key={user.userId} className="edit-row">
                    <td>
                      <input
                        className="edit-input"
                        name="firstName"
                        value={editForm.firstName}
                        onChange={handleEditChange}
                        aria-label="First name"
                      />
                      <input
                        className="edit-input"
                        name="lastName"
                        value={editForm.lastName}
                        onChange={handleEditChange}
                        aria-label="Last name"
                      />
                    </td>
                    <td>
                      <input
                        className="edit-input"
                        name="email"
                        type="email"
                        value={editForm.email}
                        onChange={handleEditChange}
                        aria-label="Email"
                      />
                    </td>
                    <td>
                      <select
                        className="edit-input"
                        name="role"
                        value={editForm.role}
                        onChange={handleEditChange}
                        disabled={user.userId === session.userId}
                        title={
                          user.userId === session.userId
                            ? "You can't change your own account's role"
                            : undefined
                        }
                      >
                        {ALL_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {editForm.role === "AcademicHead" ? (
                        <input
                          className="edit-input"
                          name="department"
                          value={editForm.department}
                          onChange={handleEditChange}
                          aria-label="Department"
                          placeholder="e.g. BSIT"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <StatusBadge status={user.isActive ? "Active" : "Inactive"} label={user.isActive ? "Active" : "Deactivated"} />
                    </td>
                    <td className="edit-actions">
                      <button
                        type="button"
                        className="edit-save"
                        onClick={() => handleEditSave(user.userId)}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                      <button type="button" className="edit-cancel" onClick={cancelEdit} disabled={isSaving}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={user.userId}>
                    <td>
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.department ?? "—"}</td>
                    <td>
                      <StatusBadge status={user.isActive ? "Active" : "Inactive"} label={user.isActive ? "Active" : "Deactivated"} />
                    </td>
                    <td className="row-actions">
                      <button type="button" className="edit-trigger" onClick={() => startEdit(user)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={user.isActive ? "toggle-deactivate" : "toggle-activate"}
                        onClick={() => handleToggle(user)}
                        disabled={pendingUserId === user.userId || user.userId === session.userId}
                        title={
                          user.userId === session.userId
                            ? "You can't change your own account's status"
                            : undefined
                        }
                      >
                        {pendingUserId === user.userId
                          ? "Saving..."
                          : user.isActive
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </Card>
    </AppLayout>
  );
}
