import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveAnnouncements } from "../api/announcementApi.js";
import { ApiError } from "../api/apiClient.js";
import "./AnnouncementsPage.css";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getActiveAnnouncements()
      .then((data) => {
        if (!cancelled) setAnnouncements(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load announcements.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="announcements-page">
      <div className="announcements-shell">
        <Link className="announcements-back-link" to="/portal">
          &larr; Back to dashboard
        </Link>

        <section className="announcements-card">
          <h1>Announcements</h1>

          {isLoading && <p>Loading...</p>}

          {errorMessage && (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          )}

          {!isLoading && !errorMessage && announcements.length === 0 && <p>No active announcements right now.</p>}

          {!isLoading && !errorMessage && announcements.length > 0 && (
            <ul className="announcements-list">
              {announcements.map((announcement) => (
                <li key={announcement.announcementId}>
                  <div className="announcements-list-header">
                    <span className={`announcements-category category-${announcement.category.toLowerCase()}`}>
                      {announcement.category}
                    </span>
                    <span className="announcements-date">{formatDate(announcement.postedAt)}</span>
                  </div>
                  <p className="announcements-title">{announcement.title}</p>
                  <p className="announcements-body">{announcement.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
