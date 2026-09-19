import { useEffect, useState } from "react";
import { Layers, CheckCircle2, Circle } from "lucide-react";
import AppShell from "../components/layout/AppShell.jsx";
import Card from "../components/ui/Card.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import { getScholarshipSlots } from "../api/evaluatorScholarshipSlotsApi.js";
import { ApiError } from "../api/apiClient.js";

export default function ScholarshipSlotsPage() {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getScholarshipSlots()
      .then((data) => {
        if (!cancelled) setSlots(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Failed to load scholarship slots.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const totalSlots = slots.reduce((sum, s) => sum + s.totalSlots, 0);
  const filledSlots = slots.reduce((sum, s) => sum + s.occupiedSlots, 0);

  return (
    <AppShell>
      <h1 className="text-2xl font-extrabold text-slate-900">Scholarship Slots</h1>
      <p className="mt-1 text-sm text-slate-500">Monitor remaining capacity · View-only for Evaluators.</p>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-status-red" role="alert">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Layers} label="Total Slots" value={totalSlots} />
          <StatCard icon={CheckCircle2} label="Slots Filled" value={filledSlots} />
          <StatCard icon={Circle} label="Remaining" value={totalSlots - filledSlots} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-slate-400">Loading...</p>}
        {!isLoading &&
          slots.map((slot) => (
            <Card key={slot.scholarshipId}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-900">{slot.name}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                      {slot.scholarshipType}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${slot.isActive ? "bg-status-green" : "bg-status-gray"}`} />
                      {slot.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="w-40">
                    <ProgressBar value={slot.occupiedSlots} max={slot.totalSlots} />
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {slot.occupiedSlots}/{slot.totalSlots}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-slate-900">{slot.remainingSlots}</p>
                    <p className="text-xs text-slate-400">slots left</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </AppShell>
  );
}
