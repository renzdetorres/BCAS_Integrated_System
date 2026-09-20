import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getScholarshipContract } from "../api/adminReportsApi.js";
import { ApiError } from "../api/apiClient.js";
import "./ScholarshipContractPage.css";

function formatDate(isoDateTime) {
  return new Date(isoDateTime).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function ScholarshipContractPage() {
  const { applicationId } = useParams();
  const [contract, setContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getScholarshipContract(applicationId)
      .then((data) => {
        if (!cancelled) setContract(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load this scholarship contract.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  return (
    <main className="contract-page">
      <div className="contract-toolbar no-print">
        <Link className="contract-back-link" to="/admin/reports">
          &larr; Back to reports
        </Link>
        {contract && (
          <button type="button" onClick={() => window.print()}>
            Print
          </button>
        )}
      </div>

      {isLoading && <p className="no-print">Loading...</p>}
      {errorMessage && (
        <p className="form-error no-print" role="alert">
          {errorMessage}
        </p>
      )}

      {contract && (
        <article className="contract-document">
          <header className="contract-header">
            <h1>Scholarship Award Contract</h1>
            <p className="contract-subtitle">BCAS Integrated Scholarship and Admissions Application and Screening System</p>
          </header>

          <p className="contract-intro">
            This certifies that <strong>{contract.applicantName}</strong> ({contract.applicantEmail}) has been
            awarded the <strong>{contract.scholarshipName}</strong> ({contract.scholarshipType}) scholarship.
          </p>

          <dl className="contract-details">
            <div>
              <dt>Applicant</dt>
              <dd>{contract.applicantName}</dd>
            </div>
            <div>
              <dt>Scholarship</dt>
              <dd>{contract.scholarshipName}</dd>
            </div>
            <div>
              <dt>Scholarship Type</dt>
              <dd>{contract.scholarshipType}</dd>
            </div>
            <div>
              <dt>Grade Average</dt>
              <dd>{contract.gradeAverage}</dd>
            </div>
            <div>
              <dt>Application Submitted</dt>
              <dd>{formatDate(contract.submittedAt)}</dd>
            </div>
            <div>
              <dt>Decided By</dt>
              <dd>{contract.decidedByName}</dd>
            </div>
            <div>
              <dt>Decision Date</dt>
              <dd>{formatDate(contract.decidedAt)}</dd>
            </div>
          </dl>

          {contract.remarks && (
            <p className="contract-remarks">
              <strong>Remarks:</strong> {contract.remarks}
            </p>
          )}

          <div className="contract-signatures">
            <div className="contract-signature-line">
              <span className="contract-signature-rule" />
              <span>Applicant Signature</span>
            </div>
            <div className="contract-signature-line">
              <span className="contract-signature-rule" />
              <span>Admin-Registrar Signature</span>
            </div>
          </div>
        </article>
      )}
    </main>
  );
}
