import TacticChip, { TechniqueChip, DataComponentChip } from "./TacticChip";
import { SeverityBadge, TriageBadge } from "../ui/Badge";
import { formatDateTime, formatRelative } from "../ui/formatters";
import { assetOf } from "../../data/detectionSample";
import { ShieldCheck } from "lucide-react";

/**
 * Full-featured alerts table.
 *
 *   onOpen(alert)  →  open detail drawer
 */
export default function AlertsTable({ alerts, onOpen, emptyLabel = "No alerts match your filters." }) {
  if (!alerts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-10 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100/60">
      <div className="hidden grid-cols-[120px,100px,minmax(0,1fr),150px,140px,100px] items-center gap-4 bg-slate-50/70 px-5 py-2.5 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 lg:grid">
        <span>Timestamp</span>
        <span>Severity</span>
        <span>Alert</span>
        <span>Asset / DC</span>
        <span>Triage (Layer C)</span>
        <span className="text-right">p(TP)</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {alerts.map((a) => {
          const asset = assetOf(a.assetId);
          return (
            <li
              key={a.id}
              className="cursor-pointer transition hover:bg-indigo-50/40"
              onClick={() => onOpen?.(a)}
            >
              <div className="grid grid-cols-1 items-center gap-3 px-5 py-3 lg:grid-cols-[120px,100px,minmax(0,1fr),150px,140px,100px] lg:gap-4">
                <div className="hidden min-w-0 text-xs text-slate-500 lg:block">
                  <div className="truncate font-medium text-slate-700">{formatDateTime(a.timestamp)}</div>
                  <div className="truncate">{formatRelative(a.timestamp)}</div>
                </div>
                <div className="hidden lg:block">
                  <SeverityBadge severity={a.severity} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 lg:hidden">
                    <SeverityBadge severity={a.severity} size="xs" />
                    <span className="text-[0.65rem] text-slate-400">{formatRelative(a.timestamp)}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-800 lg:mt-0">
                    {a.message}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.65rem] text-slate-500">
                    {a.tacticIds?.slice(0, 2).map((t) => (
                      <TacticChip key={t} id={t} />
                    ))}
                    {a.techniqueIds?.slice(0, 2).map((t) => (
                      <TechniqueChip key={t} id={t} />
                    ))}
                    {a.layerC?.usedSafetyRail ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200/70">
                        <ShieldCheck className="h-3 w-3" /> safety-rail
                      </span>
                    ) : null}
                    {a.layerC?.avarHit ? (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200/70">
                        AVAR hit
                      </span>
                    ) : null}
                    {a.chainId ? (
                      <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/70">
                        {a.chainId}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0 text-xs">
                  <div className="truncate font-medium text-slate-700">{asset.name}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
                    <DataComponentChip id={a.datacomponent} />
                    <span className="truncate">{asset.zone}</span>
                  </div>
                </div>
                <div>
                  <TriageBadge action={a.layerC?.action} />
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-medium text-slate-800">
                    {Math.round((a.layerA?.pTruePositive ?? 0) * 100)}%
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MiniAlertRow({ alert: a, onOpen }) {
  const asset = assetOf(a.assetId);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
    >
      <SeverityBadge severity={a.severity} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-800">{a.message}</p>
        <p className="truncate text-xs text-slate-500">
          {asset.name} • {formatRelative(a.timestamp)}
        </p>
      </div>
      <TriageBadge action={a.layerC?.action} />
    </button>
  );
}
