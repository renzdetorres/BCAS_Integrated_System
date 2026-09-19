import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getScholarshipContract } from "../api/adminReportsApi.js";
import { ApiError } from "../api/apiClient.js";
import { primaryButtonClasses } from "../lib/formStyles.js";

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
    <main className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="print:hidden flex items-center justify-between">
          <Link to="/admin/reports" className="text-sm font-semibold text-forest hover:underline">
            ← Back to reports
          </Link>
          {contract && (
            <button type="button" onClick={() => window.print()} className={primaryButtonClasses}>
              Print
            </button>
          )}
        </div>

        {isLoading && <p className="print:hidden mt-4 text-sm text-slate-400">Loading...</p>}
        {errorMessage && (
          <p className="print:hidden mt-4 text-sm font-medium text-status-red" role="alert">
            {errorMessage}
          </p>
        )}

        {contract && (
          <article className="mt-4 rounded-xl border-t-4 border-forest bg-white p-8 shadow-card">
            <header className="text-center">
              <h1 className="text-xl font-extrabold text-slate-900">Scholarship Award Contract</h1>
              <p className="mt-1 text-sm text-slate-500">
                BCAS Integrated Scholarship and Admissions Application and Screening System
              </p>
            </header>

            <p className="mt-6 text-sm leading-relaxed text-slate-700">
              This certifies that <strong className="font-semibold text-slate-900">{contract.applicantName}</strong> (
              {contract.applicantEmail}) has been awarded the{" "}
              <strong className="font-semibold text-slate-900">{contract.scholarshipName}</strong> (
              {contract.scholarshipType}) scholarship.
            </p>

            <dl className="mt-6 divide-y divide-slate-100">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-slate-500">Applicant</dt>
                <dd className="text-sm font-semibold text-slate-800">{contract.applicantName}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-slate-500">Scholarship</dt>
                <dd className="text-sm font-semibold text-slate-800">{contract.scholarshipName}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-slate-500">Scholarship Type</dt>
                <dd className="text-sm font-semibold text-slate-800">{contract.scholarshipType}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-slate-500">Grade Average</dt>
                <dd className="text-sm font-semibold text-slate-800">{contract.gradeAverage}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-slate-500">Application Submitted</dt>
                <dd className="text-sm font-semibold text-slate-800">{formatDate(contract.submittedAt)}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-slate-500">Decided By</dt>
                <dd className="text-sm font-semibold text-slate-800">{contract.decidedByName}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-slate-500">Decision Date</dt>
                <dd className="text-sm font-semibold text-slate-800">{formatDate(contract.decidedAt)}</dd>
              </div>
            </dl>

            {contract.remarks && (
              <p className="mt-4 text-sm text-slate-600">
                <strong className="font-semibold text-slate-800">Remarks:</strong> {contract.remarks}
              </p>
            )}

            <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2">
              <div className="text-center">
                <span className="block border-t border-slate-400 pt-2 text-sm text-slate-500">Applicant Signature</span>
              </div>
              <div className="text-center">
                <span className="block border-t border-slate-400 pt-2 text-sm text-slate-500">Admin-Registrar Signature</span>
              </div>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
