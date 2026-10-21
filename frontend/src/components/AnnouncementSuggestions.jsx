import { useState } from "react";
import Icon from "./ui/Icon.jsx";
import "./AnnouncementSuggestions.css";

// Starting points for the things the office announces most. Picking one fills an empty announcement.
const SUGGESTION_SETS = [
  [
    {
      label: "Entrance exam schedule released",
      category: "Admission",
      title: "Entrance exam schedule released",
      body: "The entrance exam schedule for this school year is now available. Choose your schedule under Exam Schedule in your portal. On exam day, bring your exam permit and a valid ID.",
    },
    {
      label: "Documents reminder",
      category: "Admission",
      title: "Reminder: submit your documents",
      body: "Please upload your required documents under Documents in your portal. Applications with missing or unclear documents cannot move to the next step. Files must be PDF, JPG or PNG, up to 10 MB each.",
    },
    {
      label: "Scholarship results are out",
      category: "Scholarship",
      title: "Scholarship results are out",
      body: "The results of the scholarship applications are now available. Open Application Tracking in your portal to see yours. Approved applicants will be contacted about the next steps.",
    },
  ],
  [
    {
      label: "Payment reminder",
      category: "Admission",
      title: "Reminder: entrance exam fee",
      body: "Pay the entrance exam fee with the QR code under Entrance Exam Payment, then upload a clear photo or screenshot of your receipt. You can choose your exam schedule once your payment is verified.",
    },
    {
      label: "Interview schedules",
      category: "Admission",
      title: "Interview schedules are being sent",
      body: "Applicants who passed the entrance exam will receive their interview schedule in the portal. Check Interview and Result regularly, and bring a parent or guardian and your original documents.",
    },
    {
      label: "Scholarship applications open",
      category: "Scholarship",
      title: "Scholarship applications are open",
      body: "Applications for this semester's scholarships are open. Apply under Scholarship Application and upload the documents listed there. Slots are limited and filled by the order applications are approved.",
    },
  ],
];

/**
 * "Suggestion" followed by ready-made announcements to start from, with a Refresh link for another set.
 * `disabled` is true once something is typed, so a suggestion can never overwrite it.
 * `onPick({ category, title, body })` fills the form.
 */
export default function AnnouncementSuggestions({ onPick, disabled = false }) {
  const [set, setSet] = useState(0);

  return (
    <div className="announcement-suggest" role="group" aria-label="Suggestions">
      <span className="announcement-suggest-label">Suggestion</span>
      <div className="announcement-suggest-list">
        {SUGGESTION_SETS[set].map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            className="announcement-chip"
            onClick={() => onPick({ category: suggestion.category, title: suggestion.title, body: suggestion.body })}
            disabled={disabled}
            title={disabled ? "Clear the title and message to use a suggestion" : "Fill the announcement with this"}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
      <button type="button" className="announcement-refresh" onClick={() => setSet((index) => (index + 1) % SUGGESTION_SETS.length)}>
        Refresh
        <Icon name="refresh" size={14} />
      </button>
    </div>
  );
}
