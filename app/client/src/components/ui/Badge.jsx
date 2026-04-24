/**
 * Lightweight pill badge.  Tones are locked to the existing palette
 * (slate / indigo / emerald / amber / rose / violet / sky / cyan / orange / red / pink).
 */
const TONES = {
  slate:   "bg-slate-100 text-slate-700 ring-slate-200/70",
  indigo:  "bg-indigo-50 text-indigo-700 ring-indigo-200/80",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  amber:   "bg-amber-50 text-amber-800 ring-amber-200/80",
  rose:    "bg-rose-50 text-rose-700 ring-rose-200/80",
  red:     "bg-red-50 text-red-700 ring-red-200/80",
  violet:  "bg-violet-50 text-violet-700 ring-violet-200/80",
  sky:     "bg-sky-50 text-sky-700 ring-sky-200/80",
  cyan:    "bg-cyan-50 text-cyan-700 ring-cyan-200/80",
  orange:  "bg-orange-50 text-orange-700 ring-orange-200/80",
  pink:    "bg-pink-50 text-pink-700 ring-pink-200/80",
};

export default function Badge({
  children,
  tone = "slate",
  size = "sm",
  className = "",
  icon,
  title,
}) {
  const sizing =
    size === "xs"
      ? "text-[0.65rem] px-1.5 py-0.5"
      : size === "md"
      ? "text-sm px-2.5 py-1"
      : "text-xs px-2 py-0.5";
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-1 rounded-full font-medium ring-1",
        TONES[tone] || TONES.slate,
        sizing,
        className,
      ].join(" ")}
    >
      {icon ? <span className="flex h-3 w-3 items-center">{icon}</span> : null}
      {children}
    </span>
  );
}

export function SeverityBadge({ severity, size = "sm" }) {
  const tone =
    severity === "critical"
      ? "red"
      : severity === "high"
      ? "rose"
      : severity === "medium"
      ? "amber"
      : severity === "low"
      ? "emerald"
      : "slate";
  return (
    <Badge tone={tone} size={size} className="uppercase tracking-wide">
      {severity || "—"}
    </Badge>
  );
}

export function StatusBadge({ status, size = "sm" }) {
  const map = {
    active:      { tone: "red",     label: "Active" },
    contained:   { tone: "emerald", label: "Contained" },
    monitoring:  { tone: "amber",   label: "Monitoring" },
    proposed:    { tone: "indigo",  label: "Proposed" },
    approved:    { tone: "violet",  label: "Approved" },
    implemented: { tone: "emerald", label: "Implemented" },
  };
  const cfg = map[status] || { tone: "slate", label: status || "—" };
  return (
    <Badge tone={cfg.tone} size={size} className="uppercase tracking-wide">
      {cfg.label}
    </Badge>
  );
}

export function TriageBadge({ action, size = "sm" }) {
  const map = {
    escalate: { tone: "red",     label: "Escalate" },
    review:   { tone: "amber",   label: "Review" },
    monitor:  { tone: "sky",     label: "Monitor" },
    drop:     { tone: "slate",   label: "Drop" },
  };
  const cfg = map[action] || { tone: "slate", label: action || "—" };
  return (
    <Badge tone={cfg.tone} size={size} className="uppercase tracking-wide">
      {cfg.label}
    </Badge>
  );
}
