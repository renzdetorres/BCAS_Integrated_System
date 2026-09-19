import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchApplicants } from "../api/supportStaffApplicantsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./SupportStaffApplicantsPage.css";

function formatDate(isoDateTime) {
  if (!isoDateTime) return "—";
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SupportStaffApplicantsPage() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [applicants, setApplicants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadApplicants = useCallback(async (activeSearch) => {
    setIsLoading(true);
    try {
      const data = await searchApplicants({ search: activeSearch });
      setApplicants(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load applicant records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplicants(appliedSearch);
  }, [appliedSearch, loadApplicants]);

  function handleSubmit(event) {
    event.preventDefault();
    setAppliedSearch(search.trim());
  }

  return (
    <main className="ss-applicants-page">
      <div className="ss-applicants-shell">
        <Link className="ss-applicants-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>Applicant Records</h1>
        <p className="ss-applicants-subtitle">
          Search applicants by name or email, view their admission application info, and jump directly into
          Document Verification for one.
        </p>

        <section className="ss-applicants-card">
          <form className="ss-applicants-search" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Search by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p>Loading...</p>
          ) : applicants.length === 0 ? (
            <p>No applicant records match this search.</p>
          ) : (
            <table className="ss-applicants-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Application</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((applicant) => (
                  <tr key={applicant.userId}>
                    <td>
                      {applicant.firstName} {applicant.lastName}
                    </td>
                    <td>{applicant.email}</td>
                    <td>
                      {applicant.applicationType ? (
                        <>
                          <span className="ss-applicants-app-type">{applicant.applicationType}</span>
                          <span className="ss-applicants-app-course">{applicant.courseAppliedFor}</span>
                        </>
                      ) : (
                        <span className="ss-applicants-no-application">No application yet</span>
                      )}
                    </td>
                    <td>
                      {applicant.applicationStatus ? (
                        <span className={`status-badge status-${applicant.applicationStatus.toLowerCase()}`}>
                          {applicant.applicationStatus}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{formatDate(applicant.submittedAt)}</td>
                    <td>
                      <Link className="ss-applicants-verify-link" to={`/support-staff/documents?applicantId=${applicant.userId}`}>
                        View Documents
                      </Link>
                    </td>
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
