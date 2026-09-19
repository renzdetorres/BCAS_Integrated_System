import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import { getActiveAnnouncements } from "../api/announcementApi.js";
import { ApiError } from "../api/apiClient.js";

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isRecent(isoDate) {
  const postedAt = new Date(isoDate).getTime();
  return Date.now() - postedAt < 3 * 24 * 60 * 60 * 1000;
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
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Announcements</h1>
      <p className="mt-1 text-sm text-slate-500">Official notices from the BCAS Admissions and Scholarship Office.</p>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-slate-400">Loading...</p>}

        {!isLoading && errorMessage && (
          <p className="text-sm font-medium text-status-red" role="alert">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && announcements.length === 0 && (
          <p className="text-sm text-slate-400">No active announcements right now.</p>
        )}

        {!isLoading &&
          !errorMessage &&
          announcements.map((announcement) => (
            <Card key={announcement.announcementId} className="relative">
              {isRecent(announcement.postedAt) && (
                <span className="absolute right-6 top-6 rounded-full bg-status-greenBg px-3 py-1 text-xs font-bold text-status-green">
                  NEW
                </span>
              )}
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
                  <Megaphone size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="pr-12 font-bold text-slate-900">{announcement.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatDate(announcement.postedAt)} · For: {announcement.category}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{announcement.body}</p>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </AppShell>
  );
}
