import Card from "./Card.jsx";

export default function StatCard({ icon: Icon, label, value, trend, iconClassName = "" }) {
  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
        {trend && <p className="mt-1 text-sm font-medium text-status-green">{trend}</p>}
      </div>
      {Icon && (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest ${iconClassName}`}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
      )}
    </Card>
  );
}
