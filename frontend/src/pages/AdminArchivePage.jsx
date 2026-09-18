import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchApplications } from "../api/adminApplicationsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./AdminArchivePage.css";

const initialFilters = { search: "", category: "", program: "" };

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminArchivePage() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadArchivedApplications = useCallback(async (activeFilters) => {
    setIsLoading(true);
    try {
      const data = await searchApplications({ ...activeFilters, archived: true });
      setApplications(data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to load archived records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchivedApplications(appliedFilters);
  }, [appliedFilters, loadArchivedApplications]);

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
    <main className="admin-archive-page">
      <div className="admin-archive-shell">
        <Link className="admin-archive-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>
        <h1>Records Archive</h1>
        <p className="admin-archive-subtitle">
          Completed/inactive admission and scholarship applications archived to support the school's document
          disposal process. Nothing here is deleted - every record (and, for an Admission application, its
          documents) remains retrievable for the school's 5-year retention practice.
        </p>

        <form className="admin-archive-filters" onSubmit={handleSubmit}>
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
            <button type="submit">Search</button>
            <button type="button" className="admin-archive-clear" onClick={handleClear}>
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
          <p>No archived records match these filters.</p>
        ) : (
          <table className="admin-archive-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Type</th>
                <th>Program</th>
                <th>Status</th>
                <th>Archived</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.applicationId}>
                  <td>
                    <Link className="admin-archive-row-link" to={`/admin/applications/${application.applicationId}`}>
                      <span className="admin-archive-name">{application.applicantName}</span>
                      <span className="admin-archive-email">{application.applicantEmail}</span>
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
                  <td>{formatDate(application.archivedAt)}</td>
                  <td className="admin-archive-reason">{application.archiveReason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
