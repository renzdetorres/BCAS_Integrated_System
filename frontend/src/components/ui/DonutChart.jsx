const HEX = {
  green: "#2F9E44",
  red: "#E03131",
  amber: "#D9A441",
  purple: "#7048E8",
  gray: "#868E96",
  blue: "#1C7ED6",
};

/** `data`: [{ label, value, color }] where color is a key of HEX. */
export default function DonutChart({ data }) {
  const rawTotal = data.reduce((sum, d) => sum + d.value, 0);
  const total = rawTotal || 1; // avoid divide-by-zero in the angle math below
  let cumulative = 0;
  const stops = data
    .map((d) => {
      const start = (cumulative / total) * 360;
      cumulative += d.value;
      const end = (cumulative / total) * 360;
      return `${HEX[d.color] ?? HEX.gray} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-6">
      <div
        className="h-36 w-36 shrink-0 rounded-full"
        style={{ background: rawTotal > 0 ? `conic-gradient(${stops})` : "#E2E8F0" }}
      >
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-lg font-extrabold text-slate-800">
            {rawTotal}
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: HEX[d.color] ?? HEX.gray }} />
            {d.label} <span className="font-semibold text-slate-800">({d.value})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
