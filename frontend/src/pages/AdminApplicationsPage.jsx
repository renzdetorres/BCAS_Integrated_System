import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./AdminApplicationsPage.css";

const initialFilters = { search: "", status: "", category: "", program: "" };

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminApplicationsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadApplications = useCallback(async (activeFilters) => {
    setIsLoading(true);
    try {
      const data = await searchApplications(activeFilters);
      setApplications(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load applications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications(appliedFilters);
  }, [appliedFilters, loadApplications]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function handleClear() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  return (
    <main className="admin-applications-page">
      <div className="admin-applications-shell">
        <Link className="admin-applications-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>Applications</h1>
        <p className="admin-applications-subtitle">
          All admission and scholarship applications. Select one to view its full detail.
        </p>

        <form className="admin-applications-filters" onSubmit={handleSubmit}>
          <div className="filter-row">
            <input
              name="search"
              type="text"
              placeholder="Search by applicant name or email"
              value={filters.search}
              onChange={handleFilterChange}
            />
            <input
              name="program"
              type="text"
              placeholder="Program / scholarship"
              value={filters.program}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-row">
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">All types</option>
              <option value="Admission">Admission</option>
              <option value="Scholarship">Scholarship</option>
            </select>
            <input
              name="status"
              type="text"
              placeholder="Status (e.g. Submitted, Approved)"
              value={filters.status}
              onChange={handleFilterChange}
            />
            <button type="submit">Search</button>
            <button type="button" className="admin-applications-clear" onClick={handleClear}>
              Clear
            </button>
          </div>
        </form>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p>Loading...</p>
        ) : applications.length === 0 ? (
          <p>No applications match these filters.</p>
        ) : (
          <table className="admin-applications-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Type</th>
                <th>Program</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.applicationId}>
                  <td>
                    <Link
                      className="admin-applications-row-link"
                      to={`/admin/applications/${application.applicationId}`}
                    >
                      <span className="admin-applications-name">{application.applicantName}</span>
                      <span className="admin-applications-email">{application.applicantEmail}</span>
                    </Link>
                  </td>
                  <td>
                    <span className={`category-badge category-${application.category.toLowerCase()}`}>
                      {application.category}
                    </span>
                  </td>
                  <td>{application.courseAppliedFor ?? application.scholarshipName}</td>
                  <td>
                    <span className={`status-badge status-${application.status.toLowerCase()}`}>
                      {application.status}
                    </span>
                  </td>
                  <td>{formatDate(application.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
