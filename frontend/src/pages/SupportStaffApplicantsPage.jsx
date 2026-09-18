import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listApplicants } from "../api/supportStaffApplicantsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./SupportStaffApplicantsPage.css";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SupportStaffApplicantsPage() {
  const [applicants, setApplicants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    listApplicants()
      .then((data) => {
        if (!cancelled) setApplicants(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load applicant records.");
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
    <main className="ss-applicants-page">
      <div className="ss-applicants-shell">
        <Link className="ss-applicants-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>Applicant Records</h1>
        <p className="ss-applicants-subtitle">Search and application detail are coming soon.</p>

        <section className="ss-applicants-card">
          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p>Loading...</p>
          ) : applicants.length === 0 ? (
            <p>No applicant accounts yet.</p>
          ) : (
            <table className="ss-applicants-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((applicant) => (
                  <tr key={applicant.userId}>
                    <td>
                      {applicant.firstName} {applicant.lastName}
                    </td>
                    <td>{applicant.email}</td>
                    <td>{formatDate(applicant.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
