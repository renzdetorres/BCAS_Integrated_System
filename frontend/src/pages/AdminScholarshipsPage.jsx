import { useCallback, useEffect, useState } from "react";
import {
  createScholarship,
  listScholarships,
  setScholarshipActiveStatus,
  updateScholarship,
} from "../api/adminScholarshipsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./AdminScholarshipsPage.css";

const initialCreateForm = { name: "", scholarshipType: "", totalSlots: "", minimumGradeAverage: "" };
const emptyEditForm = initialCreateForm;

function toRequestBody(form) {
  return {
    name: form.name.trim(),
    scholarshipType: form.scholarshipType.trim(),
    totalSlots: Number(form.totalSlots),
    minimumGradeAverage: form.minimumGradeAverage.trim() === "" ? null : Number(form.minimumGradeAverage),
  };
}

export default function AdminScholarshipsPage() {
  const [scholarships, setScholarships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [pendingToggleId, setPendingToggleId] = useState(null);

  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createdMessage, setCreatedMessage] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const loadScholarships = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listScholarships();
      setScholarships(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load scholarships.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScholarships();
  }, [loadScholarships]);

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError(null);
    setCreatedMessage(null);
    setIsCreating(true);
    try {
      await createScholarship(toRequestBody(createForm));
      setCreateForm(initialCreateForm);
      setCreatedMessage("Scholarship created.");
      await loadScholarships();
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : "Failed to create the scholarship.");
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(scholarship) {
    setEditError(null);
    setEditingId(scholarship.scholarshipId);
    setEditForm({
      name: scholarship.name,
      scholarshipType: scholarship.scholarshipType,
      totalSlots: String(scholarship.totalSlots),
      minimumGradeAverage: scholarship.minimumGradeAverage == null ? "" : String(scholarship.minimumGradeAverage),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyEditForm);
    setEditError(null);
  }

  async function handleEditSave(scholarshipId) {
    setIsSaving(true);
    setEditError(null);
    try {
      const updated = await updateScholarship(scholarshipId, toRequestBody(editForm));
      setScholarships((prev) => prev.map((s) => (s.scholarshipId === updated.scholarshipId ? updated : s)));
      setEditingId(null);
      setEditForm(emptyEditForm);
    } catch (error) {
      setEditError(error instanceof ApiError ? error.message : "Failed to update the scholarship.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle(scholarship) {
    setPendingToggleId(scholarship.scholarshipId);
    setLoadError(null);
    try {
      const updated = await setScholarshipActiveStatus(scholarship.scholarshipId, !scholarship.isActive);
      setScholarships((prev) => prev.map((s) => (s.scholarshipId === updated.scholarshipId ? updated : s)));
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to update the scholarship's status.");
    } finally {
      setPendingToggleId(null);
    }
  }

  return (
    <AppLayout title="Scholarships">
        <Card className="admin-scholarships-form-card">
          <h2>Add Scholarship</h2>
          <p className="admin-scholarships-subtitle">
            Remaining slots start equal to total slots. Deactivated scholarships stop appearing to applicants and
            can no longer be applied against.
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
            <div className="form-row-group">
              <div className="form-row">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="form-row">
                <label htmlFor="scholarshipType">Type</label>
                <input
                  id="scholarshipType"
                  type="text"
                  required
                  value={createForm.scholarshipType}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, scholarshipType: event.target.value }))}
                />
              </div>
            </div>
            <div className="form-row-group">
              <div className="form-row">
                <label htmlFor="totalSlots">Total Slots</label>
                <input
                  id="totalSlots"
                  type="number"
                  min="1"
                  required
                  value={createForm.totalSlots}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, totalSlots: event.target.value }))}
                />
              </div>
              <div className="form-row">
                <label htmlFor="minimumGradeAverage">Minimum Grade Average (optional)</label>
                <input
                  id="minimumGradeAverage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={createForm.minimumGradeAverage}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, minimumGradeAverage: event.target.value }))
                  }
                />
              </div>
            </div>

            <button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Add Scholarship"}
            </button>
          </form>
        </Card>

        <Card>
          <h2>All Scholarships</h2>

          {loadError && (
            <p className="form-error" role="alert">
              {loadError}
            </p>
          )}

          {isLoading ? (
            <p>Loading...</p>
          ) : scholarships.length === 0 ? (
            <p>No scholarships yet.</p>
          ) : (
            <table className="admin-scholarships-table">
              <thead>
                <tr>
                  <th>Name / Type</th>
                  <th>Total</th>
                  <th>Remaining</th>
                  <th>Occupied</th>
                  <th>Min. Grade</th>
                  <th>Status</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {scholarships.map((scholarship) =>
                  editingId === scholarship.scholarshipId ? (
                    <tr key={scholarship.scholarshipId} className="edit-row">
                      <td>
                        <input
                          className="edit-input"
                          value={editForm.name}
                          onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                          aria-label="Name"
                        />
                        <input
                          className="edit-input"
                          value={editForm.scholarshipType}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, scholarshipType: event.target.value }))
                          }
                          aria-label="Type"
                        />
                        {editError && (
                          <p className="form-error edit-row-error" role="alert">
                            {editError}
                          </p>
                        )}
                      </td>
                      <td>
                        <input
                          className="edit-input edit-input-narrow"
                          type="number"
                          min="1"
                          value={editForm.totalSlots}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, totalSlots: event.target.value }))
                          }
                          aria-label="Total slots"
                        />
                      </td>
                      <td>{scholarship.remainingSlots}</td>
                      <td>{scholarship.occupiedSlots}</td>
                      <td>
                        <input
                          className="edit-input edit-input-narrow"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={editForm.minimumGradeAverage}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, minimumGradeAverage: event.target.value }))
                          }
                          aria-label="Minimum grade average"
                        />
                      </td>
                      <td>
                        <StatusBadge status={scholarship.isActive ? "Active" : "Inactive"} label={scholarship.isActive ? "Active" : "Deactivated"} />
                      </td>
                      <td className="edit-actions">
                        <button
                          type="button"
                          className="edit-save"
                          onClick={() => handleEditSave(scholarship.scholarshipId)}
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
                    <tr key={scholarship.scholarshipId}>
                      <td>
                        <span className="scholarship-name">{scholarship.name}</span>
                        <span className="scholarship-type">{scholarship.scholarshipType}</span>
                      </td>
                      <td>{scholarship.totalSlots}</td>
                      <td>{scholarship.remainingSlots}</td>
                      <td>{scholarship.occupiedSlots}</td>
                      <td>{scholarship.minimumGradeAverage ?? "—"}</td>
                      <td>
                        <StatusBadge status={scholarship.isActive ? "Active" : "Inactive"} label={scholarship.isActive ? "Active" : "Deactivated"} />
                      </td>
                      <td className="row-actions">
                        <button type="button" className="edit-trigger" onClick={() => startEdit(scholarship)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={scholarship.isActive ? "toggle-deactivate" : "toggle-activate"}
                          onClick={() => handleToggle(scholarship)}
                          disabled={pendingToggleId === scholarship.scholarshipId}
                        >
                          {pendingToggleId === scholarship.scholarshipId
                            ? "Saving..."
                            : scholarship.isActive
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
