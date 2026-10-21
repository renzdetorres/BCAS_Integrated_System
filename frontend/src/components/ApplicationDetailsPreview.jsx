import { useEffect, useState } from "react";
import { DOCUMENT_TYPE_LABELS, getMyDocumentChecklist, getMyScholarshipDocumentChecklist } from "../api/documentApi.js";
import { getMyProfile } from "../api/profileApi.js";
import { getMyScholarshipApplications } from "../api/scholarshipApi.js";
import { formatCalendarDate } from "../utils/format.js";
import { formFromApplication } from "../utils/admissionForm.js";
import ApplicationSummary from "./admission/ApplicationSummary.jsx";
import Modal from "./ui/Modal.jsx";
import Skeleton from "./ui/Skeleton.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import "./admission/ApplicationSummary.css";
import "./ApplicationDetailsPreview.css";

const DASH = "—";
const statusText = (status) => status.replace(/([a-z])([A-Z])/g, "$1 $2");
const timestamp = (iso) =>
  new Date(iso).toLocaleString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

function Section({ title, children }) {
  return (
    <section className="summary-section">
      <div className="summary-section-head">
        <h3>{title}</h3>
      </div>
      <dl className="summary-list">{children}</dl>
    </section>
  );
}

function Row({ label, wide = false, children }) {
  return (
    <div className={wide ? "summary-row summary-row-wide" : "summary-row"}>
      <dt>{label}</dt>
      <dd>{children || DASH}</dd>
    </div>
  );
}

/**
 * Everything the applicant gave on one application, read-only, in a window: the application itself, their personal
 * and family details, the school details, what they declared, and where each document stands. `application` is the
 * history item and `admission` the full admission record (null for a scholarship application).
 */
export default function ApplicationDetailsPreview({ application, admission, applicationNumber, onClose }) {
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [scholarship, setScholarship] = useState(null);
  const isAdmission = application.category === "Admission";

  useEffect(() => {
    let cancelled = false;
    getMyProfile().then((data) => !cancelled && setProfile(data)).catch(() => !cancelled && setProfile(false));
    (isAdmission ? getMyDocumentChecklist() : getMyScholarshipDocumentChecklist())
      .then((data) => !cancelled && setDocuments(data.requirements ?? []))
      .catch(() => !cancelled && setDocuments(false));
    if (!isAdmission) {
      getMyScholarshipApplications()
        .then((list) => !cancelled && setScholarship(list.find((item) => item.applicationId === application.applicationId) ?? false))
        .catch(() => !cancelled && setScholarship(false));
    }
    return () => {
      cancelled = true;
    };
  }, [application.applicationId, isAdmission]);

  const values = admission ? formFromApplication(admission) : null;
  const address = profile ? [profile.addressLine, profile.city, profile.province, profile.postalCode].filter(Boolean).join(", ") : "";
  const loading = profile === null || documents === null;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Your application details"
      subtitle={applicationNumber ?? undefined}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose} data-autofocus>
          Close
        </button>
      }
    >
      {loading ? (
        <Skeleton />
      ) : (
        <div className="application-summary details-preview">
          <Section title="Application">
            <Row label="Application number">{applicationNumber ?? application.applicationId}</Row>
            <Row label="Category">{application.category}</Row>
            <Row label="Status">
              <StatusBadge status={application.status} label={statusText(application.status)} />
            </Row>
            <Row label="Submitted">{timestamp(application.submittedAt)}</Row>
          </Section>

          {isAdmission && values ? (
            <>
              <ApplicationSummary values={values} profile={profile || null} />
              <Section title="Declaration">
                <Row label="Student's signature">{values.studentSignature}</Row>
                <Row label="Parent's or guardian's signature">{values.guardianSignature}</Row>
              </Section>
            </>
          ) : (
            <>
              <Section title="Personal information">
                <Row label="Full name">{profile ? `${profile.firstName} ${profile.lastName}` : ""}</Row>
                <Row label="Date of birth">{profile?.birthDate ? formatCalendarDate(profile.birthDate) : ""}</Row>
                <Row label="Mobile number">{profile?.contactNumber}</Row>
                <Row label="Address" wide>
                  {address}
                </Row>
              </Section>
              <Section title="Scholarship">
                <Row label="Scholarship" wide>
                  {application.scholarshipName}
                </Row>
                <Row label="Scholarship type">{application.scholarshipType}</Row>
                <Row label="Level applied">{scholarship ? scholarship.levelApplied : ""}</Row>
                <Row label="Grade average">{application.gradeAverage != null ? String(application.gradeAverage) : ""}</Row>
              </Section>
            </>
          )}

          <section className="summary-section">
            <div className="summary-section-head">
              <h3>Documents</h3>
            </div>
            {documents ? (
              <ul className="details-docs">
                {documents.map((doc) => (
                  <li key={doc.documentType}>
                    <span>
                      {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                      {doc.fileName ? <small>{doc.fileName}</small> : null}
                      {doc.flaggedReason && (doc.status === "Flagged" || doc.status === "Rejected") ? <small className="details-docs-reason">{doc.flaggedReason}</small> : null}
                    </span>
                    <StatusBadge status={doc.status === "NotSubmitted" ? "NotUploaded" : doc.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="details-note">The document list couldn&apos;t be loaded. Open the Documents page to see it.</p>
            )}
          </section>

          {profile === false ? <p className="details-note">Your profile details couldn&apos;t be loaded, so some personal details are blank.</p> : null}
        </div>
      )}
    </Modal>
  );
}
