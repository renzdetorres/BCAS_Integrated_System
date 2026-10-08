import { useEffect, useState } from "react";
import { getActiveAnnouncements } from "../api/announcementApi.js";
import { ApiError } from "../api/apiClient.js";
import AppLayout from "../components/layout/AppLayout.jsx";
import Card from "../components/ui/Card.jsx";
import Modal from "../components/ui/Modal.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
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
  const [viewing, setViewing] = useState(null);

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
    <AppLayout title="Announcements">
      <Card>
        {isLoading && <p>Loading...</p>}

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && announcements.length === 0 && (
          <EmptyState icon="bell" title="No active announcements" message="Check back later for updates from BCAS." />
        )}

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
                <button type="button" className="btn btn-secondary btn-sm announcements-more" onClick={() => setViewing(announcement)}>
                  View details
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {viewing ? (
        <Modal
          open
          onClose={() => setViewing(null)}
          size="lg"
          title={viewing.title}
          subtitle={`${viewing.category} · Posted ${formatDate(viewing.postedAt)}`}
          footer={
            <button type="button" className="btn btn-secondary" onClick={() => setViewing(null)}>
              Close
            </button>
          }
        >
          <p className="announcements-full">{viewing.body}</p>
        </Modal>
      ) : null}
    </AppLayout>
  );
}
