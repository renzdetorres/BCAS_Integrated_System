// Simple vertical bar chart, no external charting library needed for a
// handful of categories.
export default function BarChart({ data, valueKey = "count", labelKey = "label" }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));

  return (
    <div className="flex h-48 items-end gap-4">
      {data.map((item) => (
        <div key={item[labelKey]} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">{item[valueKey]}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-forest"
              style={{ height: `${(item[valueKey] / max) * 100}%`, minHeight: item[valueKey] > 0 ? "4px" : 0 }}
            />
          </div>
          <span className="text-center text-xs text-slate-500">{item[labelKey]}</span>
        </div>
      ))}
    </div>
  );
}
