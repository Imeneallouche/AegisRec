import { formatDateTime } from "../ui/formatters";
import { assetOf } from "../../data/detectionSample";
import { DataComponentChip } from "./TacticChip";

const LEVEL_TONE = {
  alert: "bg-red-500/15 text-red-300 ring-red-400/40",
  warn: "bg-amber-500/15 text-amber-200 ring-amber-400/35",
  info: "bg-slate-500/10 text-slate-300 ring-slate-500/25",
  debug: "bg-slate-500/5 text-slate-400 ring-slate-600/30",
};

/**
 * Elasticsearch-backed log console: fills available height and scrolls internally.
 */
export default function LogStream({ logs = [], onInspectAlert, className = "" }) {
  if (!logs.length) {
    return (
      <div
        className={[
          "flex min-h-[12rem] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/40 px-6 py-12 text-center text-sm text-slate-400",
          className,
        ].join(" ")}
      >
        No logs match your current filters.
      </div>
    );
  }

  return (
    <div
      className={[
        "flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg ring-1 ring-slate-900/50",
        className,
      ].join(" ")}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/90 bg-gradient-to-r from-slate-900 to-slate-900/80 px-3 py-2.5 sm:px-4">
        <span className="flex min-w-0 items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="truncate">Event console</span>
        </span>
        <span className="shrink-0 rounded bg-slate-800/80 px-2 py-0.5 font-mono text-[0.65rem] tabular-nums text-slate-300">
          {logs.length} events
        </span>
      </div>

      <ul className="min-h-0 flex-1 list-none overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth [scrollbar-color:rgba(71,85,105,0.45)_transparent] [scrollbar-width:thin]">
        {logs.map((l) => {
          const asset = assetOf(l.assetId);
          const levelTone = LEVEL_TONE[l.level] || LEVEL_TONE.info;
          return (
            <li
              key={l.id}
              className="group border-b border-slate-800/50 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-slate-900/60 sm:px-4"
            >
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                <time
                  className="shrink-0 font-mono text-[0.7rem] leading-5 text-slate-500 tabular-nums"
                  dateTime={l.timestamp}
                >
                  {formatDateTime(l.timestamp)}
                </time>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider ring-1 ${levelTone}`}
                >
                  {l.level}
                </span>
                <p className="min-w-0 flex-1 basis-full break-words text-[0.8rem] leading-relaxed text-slate-100 sm:basis-auto sm:leading-6">
                  {l.message}
                </p>
              </div>
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 border-slate-700/80 pl-2 text-[0.65rem] text-slate-400 sm:pl-3">
                <span className="max-w-full break-all font-mono text-indigo-300/95" title={l.source}>
                  {l.source}
                </span>
                <span className="text-slate-600">·</span>
                <span className="min-w-0 max-w-[min(100%,12rem)] break-words text-sky-300/90 lg:max-w-[16rem]" title={asset.name}>
                  {asset.name}
                </span>
                {l.datacomponent ? (
                  <>
                    <span className="hidden text-slate-600 sm:inline">·</span>
                    <span className="[&_span]:text-[0.6rem]">
                      <DataComponentChip id={l.datacomponent} />
                    </span>
                  </>
                ) : null}
                {l.alertId ? (
                  <button
                    type="button"
                    onClick={() => onInspectAlert?.(l.alertId)}
                    className="ml-auto shrink-0 rounded-md bg-indigo-500/20 px-2 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-wide text-indigo-200 ring-1 ring-indigo-400/30 transition hover:bg-indigo-500/35"
                  >
                    {l.alertId}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
