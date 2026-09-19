import { useCallback, useEffect, useState } from "react";
import { Layers, CheckCircle2, Circle } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import Modal from "../components/ui/Modal.jsx";
import { inputClasses, labelClasses, primaryButtonClasses, outlineButtonClasses } from "../lib/formStyles.js";
import {
  createScholarship,
  listScholarships,
  setScholarshipActiveStatus,
  updateScholarship,
} from "../api/academicHeadScholarshipsApi.js";
import { ApiError } from "../api/apiClient.js";

const initialForm = { name: "", scholarshipType: "", totalSlots: "", minimumGradeAverage: "" };

function toRequestBody(form) {
  return {
    name: form.name.trim(),
    scholarshipType: form.scholarshipType.trim(),
    totalSlots: Number(form.totalSlots),
    minimumGradeAverage: form.minimumGradeAverage.trim() === "" ? null : Number(form.minimumGradeAverage),
  };
}

export default function AcademicHeadScholarshipsPage() {
  const [scholarships, setScholarships] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState(null);

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const loadScholarships = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listScholarships();
      setScholarships(data);
      setLoadError(null);
      setIsForbidden(false);
    } catch (error) {
      setLoadError(error instanceof ApiError ? error.message : "Failed to load scholarships.");
      setIsForbidden(error instanceof ApiError && error.status === 403);
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
    setIsCreating(true);
    try {
      await createScholarship(toRequestBody(createForm));
      setCreateForm(initialForm);
      setCreateOpen(false);
      await loadScholarships();
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : "Failed to create the scholarship.");
    } finally {
      setIsCreating(false);
    }
  }

  function startEdit(scholarship) {
    setEditError(null);
    setEditing(scholarship);
    setEditForm({
      name: scholarship.name,
      scholarshipType: scholarship.scholarshipType,
      totalSlots: String(scholarship.totalSlots),
      minimumGradeAverage: scholarship.minimumGradeAverage == null ? "" : String(scholarship.minimumGradeAverage),
    });
  }

  async function handleEditSave(event) {
    event.preventDefault();
    setIsSaving(true);
    setEditError(null);
    try {
      const updated = await updateScholarship(editing.scholarshipId, toRequestBody(editForm));
      setScholarships((prev) => prev.map((s) => (s.scholarshipId === updated.scholarshipId ? updated : s)));
      setEditing(null);
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

  const totalSlots = scholarships.reduce((sum, s) => sum + s.totalSlots, 0);
  const usedSlots = scholarships.reduce((sum, s) => sum + s.occupiedSlots, 0);

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Scholarship Slots</h1>
          <p className="mt-1 text-sm text-slate-500">
            Available if an Admin-Registrar has authorized this area for your role.
          </p>
        </div>
        {!isForbidden && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-dark"
          >
            + Add Slot
          </button>
        )}
      </div>

      {isForbidden ? (
        <Card className="mt-6">
          <p className="text-sm font-medium text-status-red" role="alert">
            {loadError}
          </p>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={Layers} label="Total Slots" value={totalSlots} />
            <StatCard icon={CheckCircle2} label="Slots Used" value={usedSlots} />
            <StatCard icon={Circle} label="Slots Remaining" value={totalSlots - usedSlots} />
          </div>

          {loadError && (
            <p className="mt-4 text-sm font-medium text-status-red" role="alert">
              {loadError}
            </p>
          )}

          <div className="mt-6 space-y-3">
            {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
            {!isLoading && scholarships.length === 0 && <p className="text-sm text-slate-400">No scholarships yet.</p>}
            {!isLoading &&
              scholarships.map((slot) => {
                const isFull = slot.remainingSlots <= 0;
                return (
                  <Card key={slot.scholarshipId}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900">{slot.name}</p>
                          {isFull && (
                            <span className="rounded-full bg-status-redBg px-2.5 py-0.5 text-xs font-bold text-status-red">
                              FULL
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                            {slot.scholarshipType}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${slot.isActive ? "bg-status-green" : "bg-status-gray"}`}
                            />
                            {slot.isActive ? "Open" : "Closed"}
                          </span>
                          {slot.minimumGradeAverage != null && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                              Min. GWA {slot.minimumGradeAverage}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="w-40">
                          <ProgressBar value={slot.occupiedSlots} max={slot.totalSlots} />
                          <p className="mt-1 text-right text-xs text-slate-400">
                            {slot.occupiedSlots}/{slot.totalSlots}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggle(slot)}
                            disabled={pendingToggleId === slot.scholarshipId}
                            className={outlineButtonClasses}
                          >
                            {pendingToggleId === slot.scholarshipId ? "Saving..." : slot.isActive ? "Close" : "Open"}
                          </button>
                          <button type="button" onClick={() => startEdit(slot)} className={outlineButtonClasses}>
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </>
      )}

      {isCreateOpen && (
        <Modal title="Add Slot" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className={labelClasses} htmlFor="name">
                Slot name
              </label>
              <input
                id="name"
                className={inputClasses}
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="scholarshipType">
                Category
              </label>
              <input
                id="scholarshipType"
                className={inputClasses}
                required
                placeholder="e.g. Merit-Based"
                value={createForm.scholarshipType}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, scholarshipType: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="totalSlots">
                Total slots
              </label>
              <input
                id="totalSlots"
                type="number"
                min={1}
                className={inputClasses}
                required
                value={createForm.totalSlots}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, totalSlots: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="minimumGradeAverage">
                Minimum grade average (optional)
              </label>
              <input
                id="minimumGradeAverage"
                type="number"
                min={0}
                max={100}
                step="0.01"
                className={inputClasses}
                value={createForm.minimumGradeAverage}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, minimumGradeAverage: e.target.value }))}
              />
            </div>

            {createError && (
              <p className="text-sm font-medium text-status-red" role="alert">
                {createError}
              </p>
            )}

            <button type="submit" disabled={isCreating} className={`${primaryButtonClasses} w-full`}>
              {isCreating ? "Creating..." : "Add Slot"}
            </button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div>
              <label className={labelClasses} htmlFor="editName">
                Slot name
              </label>
              <input
                id="editName"
                className={inputClasses}
                required
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="editType">
                Category
              </label>
              <input
                id="editType"
                className={inputClasses}
                required
                value={editForm.scholarshipType}
                onChange={(e) => setEditForm((prev) => ({ ...prev, scholarshipType: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="editTotalSlots">
                Total slots
              </label>
              <input
                id="editTotalSlots"
                type="number"
                min={1}
                className={inputClasses}
                required
                value={editForm.totalSlots}
                onChange={(e) => setEditForm((prev) => ({ ...prev, totalSlots: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClasses} htmlFor="editMinGrade">
                Minimum grade average (optional)
              </label>
              <input
                id="editMinGrade"
                type="number"
                min={0}
                max={100}
                step="0.01"
                className={inputClasses}
                value={editForm.minimumGradeAverage}
                onChange={(e) => setEditForm((prev) => ({ ...prev, minimumGradeAverage: e.target.value }))}
              />
            </div>

            {editError && (
              <p className="text-sm font-medium text-status-red" role="alert">
                {editError}
              </p>
            )}

            <button type="submit" disabled={isSaving} className={`${primaryButtonClasses} w-full`}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
