import { StatusBadge } from "../ui/Badge";
import { TechniqueChip, AssetChip } from "./TacticChip";
import { ShieldCheck, AlertTriangle, MapPin } from "lucide-react";

/**
 * Mitigation card used in the Mitigations page and inside drawers.
 *
 * Props:
 *  - mitigation      Mitigation record (see data/detectionSample)
 *  - compact         tighter layout (used inside chain drawer)
 *  - onOpen          click handler → opens detail drawer
 */
export default function MitigationCard({ mitigation: m, compact = false, onOpen }) {
  const priorityTone =
    m.priority === "critical"
      ? "text-red-600 bg-red-50 ring-red-200/70"
      : m.priority === "high"
      ? "text-rose-600 bg-rose-50 ring-rose-200/70"
      : m.priority === "medium"
      ? "text-amber-700 bg-amber-50 ring-amber-200/70"
      : "text-emerald-700 bg-emerald-50 ring-emerald-200/70";

  return (
    <article
      className={[
        "group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/60 transition hover:-translate-y-0.5 hover:shadow-md",
        compact ? "" : "min-h-[14rem]",
      ].join(" ")}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
    >
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/60 px-5 py-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/60"
          aria-hidden
        >
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">{m.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ring-1 ${priorityTone}`}>
              {m.priority}
            </span>
            <StatusBadge status={m.status} />
            {m.requiresHumanApproval ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200/70">
                <AlertTriangle className="h-3 w-3" /> human approval
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 px-5 py-4">
        <p className={compact ? "line-clamp-2 text-sm text-slate-600" : "line-clamp-3 text-sm leading-relaxed text-slate-600"}>
          {m.rationale}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {(m.appliesToTechniques || []).slice(0, 4).map((t) => (
            <TechniqueChip key={t} id={t} />
          ))}
          {m.kgMitigationId ? (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-violet-700 ring-1 ring-violet-200/70">
              {m.kgMitigationId} · {m.kgMitigationName}
            </span>
          ) : null}
        </div>

        {!compact ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 text-slate-500">
              <MapPin className="h-3.5 w-3.5" /> Apply at:
            </span>
            {(m.appliesToAssets || []).map((a) => (
              <AssetChip key={a} id={a} />
            ))}
            {(m.appliesToZones || []).map((z) => (
              <span key={z} className="rounded-full bg-slate-50 px-2 py-0.5 text-[0.65rem] font-medium text-slate-600 ring-1 ring-slate-200/60">
                {z}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
        <span>
          {(m.alertIds || []).length} related alert{(m.alertIds || []).length === 1 ? "" : "s"}
          {m.chainId ? ` · ${m.chainId}` : ""}
        </span>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-indigo-600 group-hover:bg-indigo-100">
          Review plan →
        </span>
      </div>
    </article>
  );
}
