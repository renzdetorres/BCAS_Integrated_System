import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getScholarshipSlots } from "../api/evaluatorScholarshipSlotsApi.js";
import { ApiError } from "../api/apiClient.js";
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
    <main className="scholarship-slots-page">
      <div className="scholarship-slots-card">
        <Link className="scholarship-slots-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>Scholarship Slots</h1>
        <p className="scholarship-slots-subtitle">
          Read-only. Available and occupied slots per scholarship.
        </p>

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
                    <span className={scholarship.isActive ? "slots-status-active" : "slots-status-inactive"}>
                      {scholarship.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{scholarship.occupiedSlots}</td>
                  <td>{scholarship.remainingSlots}</td>
                  <td>{scholarship.totalSlots}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
