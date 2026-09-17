import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listUsers, setUserActiveStatus } from "../api/adminApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import "./ManageUsersPage.css";

export default function ManageUsersPage() {
  const { session } = useSession();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingUserId, setPendingUserId] = useState(null);

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

  return (
    <main className="manage-users-page">
      <div className="manage-users-card">
        <Link className="manage-users-back-link" to="/portal">
          &larr; Back to portal
        </Link>
        <h1>Manage Accounts</h1>
        <p className="manage-users-subtitle">
          Deactivating an account blocks login without deleting it or any linked records.
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
                <th>Status</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId}>
                  <td>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <span className={user.isActive ? "status-active" : "status-inactive"}>
                      {user.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td>
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
