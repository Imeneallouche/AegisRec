import TacticChip, { TechniqueChip } from "./TacticChip";
import { SeverityBadge, StatusBadge } from "../ui/Badge";
import ConfidenceBar from "../ui/ConfidenceBar";
import { formatRelative } from "../ui/formatters";
import { assetOf } from "../../data/detectionSample";
import { ShieldAlert, Target, Network } from "lucide-react";

export default function ChainCard({ chain, onOpen }) {
  const tactics = (chain.tactics || []).slice(0, 5);
  const techniques = (chain.techniques || []).slice(0, 4);
  const targets = (chain.targetAssets || []).slice(0, 4).map(assetOf);

  return (
    <article
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/60 transition hover:-translate-y-0.5 hover:shadow-md"
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
      <div className="flex items-start gap-3 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/50 px-6 py-5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/70"
          aria-hidden
        >
          <Target className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">
              {chain.name}
            </h3>
            <StatusBadge status={chain.status} />
            <SeverityBadge severity={chain.severity} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            First seen {formatRelative(chain.startedAt)} • Last seen {formatRelative(chain.lastSeenAt)}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 px-6 py-5">
        <p className="line-clamp-3 text-sm leading-7 text-slate-600">
          {chain.summary}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {tactics.map((t) => (
            <TacticChip key={t} id={t} />
          ))}
          {techniques.map((t) => (
            <TechniqueChip key={t} id={t} />
          ))}
        </div>

        <ConfidenceBar value={chain.confidence} label="Layer B confidence" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-3.5 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
            <span className="font-medium text-slate-700">{chain.alertsCount}</span>
            <span>alerts</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Network className="h-3.5 w-3.5 text-slate-400" />
            {targets.map((a) => a.name).join(" • ") || "—"}
          </span>
        </div>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-indigo-600 group-hover:bg-indigo-100">
          View chain →
        </span>
      </div>
    </article>
  );
}
