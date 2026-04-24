import { formatDateTime } from "../ui/formatters";
import { assetOf } from "../../data/detectionSample";
import { DataComponentChip } from "./TacticChip";

const LEVEL_TONE = {
  alert: "bg-red-50 text-red-700 ring-red-200/70",
  warn:  "bg-amber-50 text-amber-700 ring-amber-200/70",
  info:  "bg-slate-50 text-slate-600 ring-slate-200/70",
  debug: "bg-slate-50 text-slate-400 ring-slate-200/70",
};

export default function LogStream({ logs = [], onInspectAlert }) {
  if (!logs.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-10 text-center text-sm text-slate-500">
        No logs match your current filters.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-950 text-slate-100 shadow-sm ring-1 ring-slate-900/10">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live log stream
        </span>
        <span>{logs.length} events</span>
      </div>
      <ul className="divide-y divide-slate-800/60 font-mono text-[0.75rem] leading-relaxed">
        {logs.map((l) => {
          const asset = assetOf(l.assetId);
          const levelTone = LEVEL_TONE[l.level] || LEVEL_TONE.info;
          return (
            <li
              key={l.id}
              className="group flex min-w-0 gap-3 px-4 py-2.5 hover:bg-slate-900/70"
            >
              <span className="hidden shrink-0 text-slate-500 sm:inline">{formatDateTime(l.timestamp)}</span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider ring-1 ${levelTone}`}>
                {l.level}
              </span>
              <span className="shrink-0 truncate text-indigo-300">{l.source}</span>
              <span className="shrink-0 text-sky-300">{asset.name}</span>
              <span className="min-w-0 flex-1 truncate text-slate-200 [overflow-wrap:anywhere]">
                {l.message}
              </span>
              {l.datacomponent ? (
                <span className="hidden shrink-0 lg:inline">
                  <DataComponentChip id={l.datacomponent} />
                </span>
              ) : null}
              {l.alertId ? (
                <button
                  type="button"
                  onClick={() => onInspectAlert?.(l.alertId)}
                  className="shrink-0 rounded-md bg-indigo-500/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-indigo-200 transition hover:bg-indigo-500/40"
                >
                  {l.alertId}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
