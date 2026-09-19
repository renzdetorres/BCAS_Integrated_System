import { statusColorClasses } from "../../lib/statusColors.js";

export default function StatusBadge({ status, label }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusColorClasses(
        status
      )}`}
    >
      {label ?? status}
    </span>
  );
}
