/**
 * Compact metric tile. Uses the same card surface as the rest of the app.
 */
export default function StatCard({
  title,
  value,
  hint,
  trend,            // { direction: 'up'|'down', label: '+12%' }
  icon: Icon,
  tone = "indigo",
}) {
  const iconTone = {
    indigo:  "bg-indigo-50 text-indigo-600 ring-indigo-200/70",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200/70",
    amber:   "bg-amber-50 text-amber-700 ring-amber-200/70",
    rose:    "bg-rose-50 text-rose-600 ring-rose-200/70",
    red:     "bg-red-50 text-red-600 ring-red-200/70",
    sky:     "bg-sky-50 text-sky-600 ring-sky-200/70",
    slate:   "bg-slate-50 text-slate-600 ring-slate-200/70",
  }[tone];

  const trendTone =
    trend?.direction === "up"
      ? "text-emerald-600"
      : trend?.direction === "down"
      ? "text-rose-600"
      : "text-slate-400";

  return (
    <div className="flex min-w-0 flex-1 items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-100/60">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend ? (
            <span className={`font-medium ${trendTone}`}>
              {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "•"} {trend.label}
            </span>
          ) : null}
          {hint ? <span className="text-slate-400">{hint}</span> : null}
        </div>
      </div>
      {Icon ? (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${iconTone}`}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
    </div>
  );
}
