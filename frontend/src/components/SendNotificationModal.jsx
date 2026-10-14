import { useState } from "react";
import { sendStaffNotification } from "../api/staffNotificationsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useToast } from "../context/ToastContext.jsx";
import Modal from "./ui/Modal.jsx";
import "./SendNotificationModal.css";

// Common messages staff send by hand; picking one fills the fields, which can still be edited.
const TEMPLATES = [
  { value: "custom", label: "Write my own", subject: "", message: "" },
  {
    value: "documents",
    label: "Missing documents",
    subject: "A Required Document Is Still Missing",
    message: "Your application is still missing a required document. Please log in to your applicant portal and upload it so we can continue reviewing your application.",
  },
  {
    value: "payment",
    label: "Entrance exam payment",
    subject: "Entrance Exam Payment",
    message: "Please pay the entrance exam fee and upload your proof of payment in your applicant portal so we can release your exam permit.",
  },
  {
    value: "exam",
    label: "Exam reminder",
    subject: "Reminder: Your Entrance Exam",
    message: "This is a reminder about your entrance exam. Please check your exam schedule and permit in your applicant portal, and arrive at least 30 minutes early.",
  },
  {
    value: "originals",
    label: "Bring original documents",
    subject: "Reminder: Bring Your Original Documents",
    message: "Please bring the original copies of your submitted documents to the interview.",
  },
];

/** A staff member writes to one applicant: they get a system notification and an email. */
export default function SendNotificationModal({ applicant, onClose }) {
  const { showToast } = useToast();
  const [template, setTemplate] = useState("custom");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  function chooseTemplate(value) {
    const chosen = TEMPLATES.find((t) => t.value === value);
    setTemplate(value);
    if (value !== "custom") {
      setSubject(chosen.subject);
      setMessage(chosen.message);
    }
  }

  async function handleSend() {
    if (!subject.trim() || !message.trim()) {
      setErrorMessage("Write a subject and a message first.");
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    try {
      await sendStaffNotification({ userId: applicant.userId, subject: subject.trim(), message: message.trim() });
      showToast(`Notification sent to ${applicant.firstName} ${applicant.lastName}.`);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Failed to send the notification. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSending}
      title="Send a notification"
      subtitle={`To ${applicant.firstName} ${applicant.lastName} · ${applicant.email}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSending}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSend} disabled={isSending}>
            {isSending ? "Sending..." : "Send notification"}
          </button>
        </>
      }
    >
      <div className="send-notification">
        <p className="send-notification-hint">The applicant sees this in their notifications and also gets it by email.</p>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="form-row">
          <label htmlFor="notify-template">Start from</label>
          <select id="notify-template" value={template} onChange={(event) => chooseTemplate(event.target.value)}>
            {TEMPLATES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="notify-subject">Subject</label>
          <input id="notify-subject" type="text" maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} data-autofocus />
        </div>

        <div className="form-row">
          <label htmlFor="notify-message">Message</label>
          <textarea id="notify-message" rows={5} maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} />
          <span className="send-notification-count">{message.length} / 1000</span>
        </div>
      </div>
    </Modal>
  );
}
