import { useEffect, useMemo, useState } from "react";
import { getAdmissionSlots, saveAdmissionSlots } from "../api/admissionSlotsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import Skeleton from "../components/ui/Skeleton.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./AdminAdmissionSlotsPage.css";

const keyOf = (row) => `${row.category}|${row.level}`;

function SlotState({ row }) {
  if (row.slots == null) return <span className="admission-slots-muted">No limit</span>;
  return row.isFull ? <StatusBadge status="Rejected" label="Full" /> : <StatusBadge status="Active" label="Open" />;
}

/**
 * Admission Slots: how many applicants each level takes. A level left blank has no limit. When a level is full
 * the applicant can still submit, and is told the slot for that level has been reached.
 */
export default function AdminAdmissionSlotsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [values, setValues] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  function applyLoaded(data) {
    setRows(data);
    setValues(Object.fromEntries(data.map((row) => [keyOf(row), row.slots == null ? "" : String(row.slots)])));
  }

  useEffect(() => {
    let cancelled = false;

    getAdmissionSlots()
      .then((data) => {
        if (!cancelled) applyLoaded(data);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to load the admission slots.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const grouped = new Map();
    for (const row of rows) {
      if (!grouped.has(row.category)) grouped.set(row.category, []);
      grouped.get(row.category).push(row);
    }
    return [...grouped.entries()];
  }, [rows]);

  const invalid = rows.find((row) => {
    const text = (values[keyOf(row)] ?? "").trim();
    return text !== "" && !/^\d{1,6}$/.test(text);
  });
  const isChanged = rows.some((row) => (values[keyOf(row)] ?? "").trim() !== (row.slots == null ? "" : String(row.slots)));

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await saveAdmissionSlots(
        rows.map((row) => {
          const text = (values[keyOf(row)] ?? "").trim();
          return { category: row.category, level: row.level, slots: text === "" ? null : Number(text) };
        }),
      );
      applyLoaded(saved);
      showToast("Admission slots saved.");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to save the admission slots.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppLayout title="Admission Slots">
      <Card>
        <p className="admission-slots-intro">
          Set how many applicants each level takes for the current academic year. Leave a level blank for no limit; set
          0 to close it. When a level is full an applicant can still submit, and is told that the admission slot for the
          level has been reached. Rejected and retracted applications do not use a slot.
        </p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <Skeleton variant="table" />
        ) : (
          <>
            {categories.map(([category, levels]) => (
              <section key={category} className="admission-slots-group">
                <h2 className="admission-slots-category">{category}</h2>
                <table className="admission-slots-table">
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Slots</th>
                      <th>Taken</th>
                      <th>Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((row) => (
                      <tr key={keyOf(row)}>
                        <td>{row.level}</td>
                        <td>
                          <input
                            className="admission-slots-input"
                            type="text"
                            inputMode="numeric"
                            placeholder="No limit"
                            aria-label={`Slots for ${row.level}`}
                            value={values[keyOf(row)] ?? ""}
                            onChange={(event) => setValues((prev) => ({ ...prev, [keyOf(row)]: event.target.value }))}
                          />
                        </td>
                        <td>{row.taken}</td>
                        <td>{row.remaining == null ? "—" : row.remaining}</td>
                        <td>
                          <SlotState row={row} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}

            {invalid && (
              <p className="form-error" role="alert">
                Slots for {invalid.level} must be a whole number (or blank for no limit).
              </p>
            )}

            <div className="admission-slots-actions">
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving || !isChanged || Boolean(invalid)}>
                {isSaving ? "Saving..." : "Save slots"}
              </button>
            </div>
          </>
        )}
      </Card>
    </AppLayout>
  );
}
