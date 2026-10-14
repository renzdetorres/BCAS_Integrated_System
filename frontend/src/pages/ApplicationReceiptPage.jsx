import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getMyApplicationHistory } from "../api/applicationHistoryApi.js";
import { APPLICATION_TYPES, getMyAdmissionApplications } from "../api/admissionApi.js";
import { ApiError } from "../api/apiClient.js";
import { buildPdf, downloadBlob } from "../utils/simplePdf.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import BcasSeal from "../components/ui/BcasSeal.jsx";
import "./ApplicationReceiptPage.css";

function formatTimestamp(isoDateTime) {
  return new Date(isoDateTime).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusText(status) {
  return status.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function admissionTypeLabel(applicationType) {
  return APPLICATION_TYPES.find((t) => t.value === applicationType)?.label ?? applicationType;
}

export default function ApplicationReceiptPage() {
  const { applicationId } = useParams();
  const [searchParams] = useSearchParams();
  const [application, setApplication] = useState(null);
  const [applicationNumber, setApplicationNumber] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getMyApplicationHistory(), getMyAdmissionApplications().catch(() => [])])
      .then(([data, admissions]) => {
        if (cancelled) return;
        setApplication(data.find((a) => a.applicationId === applicationId) ?? null);
        setApplicationNumber(admissions.find((a) => a.applicationId === applicationId)?.applicationNumber ?? null);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load your receipt.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  // The receipt as a PDF file the applicant can keep.
  function downloadPdf() {
    const rows = [
      ["Application number", applicationNumber ?? application.applicationId],
      ["Category", application.category],
      ["Status", statusText(application.status)],
      ...(application.category === "Admission"
        ? [
            ["Application type", admissionTypeLabel(application.applicationType)],
            ["Course applied for", application.courseAppliedFor],
            ["Previous school", application.previousSchool],
          ]
        : [
            ["Scholarship", application.scholarshipName],
            ["Scholarship type", application.scholarshipType],
            ["Grade average", String(application.gradeAverage)],
          ]),
      ["Submitted", formatTimestamp(application.submittedAt)],
    ];
    const blob = buildPdf({
      title: "Application Confirmation Receipt",
      subtitle: "Batangas College of Arts and Sciences, Inc.",
      rows,
      footer: "Keep this receipt. Your application number identifies your application on every BCAS screen and email.",
    });
    downloadBlob(blob, `BCAS-receipt-${applicationNumber ?? application.applicationId}.pdf`);
  }

  // "Download" on the application page opens this page with ?download=1.
  const wantsDownload = searchParams.get("download") === "1";
  useEffect(() => {
    if (wantsDownload && application) downloadPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsDownload, application]);

  return (
    <AppLayout title="Application Receipt">
      {isLoading && (
        <Card>
          <p>Loading...</p>
        </Card>
      )}

      {!isLoading && errorMessage && (
        <Card>
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        </Card>
      )}

      {!isLoading && !errorMessage && !application && (
        <Card>
          <p>No application found with that id.</p>
        </Card>
      )}

      {!isLoading && application && (
        <Card className="receipt">
          <div className="receipt-letterhead">
            <BcasSeal size={40} />
            <div>
              <p className="receipt-eyebrow">BCAS Application Confirmation Receipt</p>
              <p className="receipt-application-id">{applicationNumber ?? application.applicationId}</p>
            </div>
          </div>

          <dl className="receipt-details">
            <div>
              <dt>Category</dt>
              <dd>{application.category}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={application.status} />
              </dd>
            </div>

            {application.category === "Admission" && (
              <>
                <div>
                  <dt>Application type</dt>
                  <dd>{admissionTypeLabel(application.applicationType)}</dd>
                </div>
                <div>
                  <dt>Course applied for</dt>
                  <dd>{application.courseAppliedFor}</dd>
                </div>
                <div>
                  <dt>Previous school</dt>
                  <dd>{application.previousSchool}</dd>
                </div>
              </>
            )}

            {application.category === "Scholarship" && (
              <>
                <div>
                  <dt>Scholarship</dt>
                  <dd>{application.scholarshipName}</dd>
                </div>
                <div>
                  <dt>Scholarship type</dt>
                  <dd>{application.scholarshipType}</dd>
                </div>
                <div>
                  <dt>Grade average</dt>
                  <dd>{application.gradeAverage}</dd>
                </div>
              </>
            )}

            <div>
              <dt>Submitted</dt>
              <dd>{formatTimestamp(application.submittedAt)}</dd>
            </div>
          </dl>

          <div className="receipt-actions no-print">
            <button type="button" className="btn btn-primary" onClick={downloadPdf}>
              Download PDF
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
              Print
            </button>
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
