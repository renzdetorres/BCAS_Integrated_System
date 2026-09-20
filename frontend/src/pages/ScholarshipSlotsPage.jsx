import { useEffect, useState } from "react";
import { getScholarshipSlots } from "../api/evaluatorScholarshipSlotsApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import "./ScholarshipSlotsPage.css";

export default function ScholarshipSlotsPage() {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getScholarshipSlots()
      .then((data) => {
        if (!cancelled) setSlots(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load scholarship slots.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppLayout title="Scholarship Slots">
      <Card>
        <p className="scholarship-slots-subtitle">Read-only. Available and occupied slots per scholarship.</p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <table className="scholarship-slots-table">
            <thead>
              <tr>
                <th>Scholarship</th>
                <th>Type</th>
                <th>Status</th>
                <th>Occupied</th>
                <th>Available</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((scholarship) => (
                <tr key={scholarship.scholarshipId}>
                  <td>{scholarship.name}</td>
                  <td>{scholarship.scholarshipType}</td>
                  <td>
                    <StatusBadge status={scholarship.isActive ? "Active" : "Inactive"} />
                  </td>
                  <td>{scholarship.occupiedSlots}</td>
                  <td>{scholarship.remainingSlots}</td>
                  <td>{scholarship.totalSlots}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </AppLayout>
  );
}
