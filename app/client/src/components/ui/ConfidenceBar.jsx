/**
 * Horizontal bar for 0..1 confidence / probability values.
 */
export default function ConfidenceBar({ value = 0, label, tone = "auto", showValue = true, size = "md" }) {
  const pct = Math.max(0, Math.min(1, Number(value) || 0));
  const p = Math.round(pct * 100);

  const resolvedTone =
    tone === "auto"
      ? pct >= 0.85
        ? "red"
        : pct >= 0.7
        ? "rose"
        : pct >= 0.5
        ? "amber"
        : "emerald"
      : tone;

  const bg = {
    red:     "bg-red-500",
    rose:    "bg-rose-500",
    amber:   "bg-amber-500",
    emerald: "bg-emerald-500",
    indigo:  "bg-indigo-500",
    slate:   "bg-slate-500",
  }[resolvedTone] || "bg-indigo-500";

  const height = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className="w-full min-w-0">
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="truncate">{label || ""}</span>
          {showValue ? <span className="font-medium text-slate-700">{p}%</span> : null}
        </div>
      )}
      <div className={`relative w-full overflow-hidden rounded-full bg-slate-100 ${height}`}>
        <div
          className={`${bg} ${height} rounded-full transition-all`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}
