import { useEffect, useState } from "react";
import { getEmailStatus, sendTestEmail } from "../api/emailSettingsApi.js";
import { ApiError } from "../api/apiClient.js";
import { useSession } from "../context/SessionContext.jsx";
import Card from "./ui/Card.jsx";
import StatusBadge from "./ui/StatusBadge.jsx";
import "./EmailSettingsPanel.css";

/** Admin: whether password reset links and notification emails can go out, with a test button that shows the real error. */
export default function EmailSettingsPanel() {
  const { session } = useSession();
  const [status, setStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getEmailStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof ApiError ? error.message : "Failed to check the email settings.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTest() {
    setIsSending(true);
    setResult(null);
    try {
      await sendTestEmail();
      setResult({ ok: true, text: `Test email sent to ${session.email}. Check the inbox, and the spam folder if it isn't there.` });
    } catch (error) {
      setResult({ ok: false, text: error instanceof ApiError ? error.message : "The test email couldn't be sent." });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <h2 className="email-title">Email</h2>
      <p className="email-subtitle">
        Password reset links and notifications are sent by email. This shows whether the system can send, and lets you prove it with a test message.
      </p>

      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
      {!status && !errorMessage && <p>Checking...</p>}

      {status && (
        <>
          <div className="email-state">
            <StatusBadge status={status.configured ? "Approved" : "Pending"} label={status.configured ? "Set up" : "Not set up"} />
            {status.configured && (
              <span className="email-detail">
                Sends as {status.fromAddress} through {status.host}:{status.port}
              </span>
            )}
          </div>

          {status.problems.length > 0 && (
            <div className="email-missing">
              <p>Still needed, on the server that runs the system (as settings or environment variables):</p>
              <ul>
                {status.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
              <p className="email-hint">
                For Gmail: turn on 2-Step Verification, create an app password at myaccount.google.com/apppasswords, and use the Gmail address
                for both the username and the sender. Restart the site after changing them.
              </p>
            </div>
          )}

          <div className="email-actions">
            <button type="button" className="btn btn-primary" onClick={handleTest} disabled={isSending || !status.configured}>
              {isSending ? "Sending..." : `Send a test email to ${session.email}`}
            </button>
          </div>

          {result && (
            <p className={result.ok ? "form-success" : "form-error"} role={result.ok ? "status" : "alert"}>
              {result.text}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
