import TacticChip, { TechniqueChip, DataComponentChip } from "./TacticChip";
import ConfidenceBar from "../ui/ConfidenceBar";
import { formatTime } from "../ui/formatters";
import { assetOf } from "../../data/detectionSample";

/**
 * Vertical step-by-step timeline of an attack chain.  Each step corresponds
 * to a link attributed by Layer B (causal-window Transformer).
 */
export default function ChainTimeline({ steps = [] }) {
  if (!steps.length) {
    return (
      <p className="text-sm text-slate-500">
        No steps attributed yet for this chain.
      </p>
    );
  }
  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-6">
      {steps.map((s, idx) => {
        const asset = assetOf(s.asset);
        return (
          <li key={`${s.ts}-${idx}`} className="relative">
            <span
              className="absolute -left-[33px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[0.65rem] font-semibold text-indigo-700 ring-2 ring-indigo-300 shadow-sm"
              aria-hidden
            >
              {idx + 1}
            </span>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/70">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-semibold text-slate-900">{s.title}</h4>
                <span className="text-xs text-slate-500">{formatTime(s.ts)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <TacticChip id={s.tactic} />
                <TechniqueChip id={s.technique} />
                {s.dc ? <DataComponentChip id={s.dc} /> : null}
                <span className="text-xs text-slate-400">on</span>
                <span className="text-xs font-medium text-slate-700">{asset.name}</span>
              </div>
              {s.evidence ? (
                <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 [overflow-wrap:anywhere]">
                  {s.evidence}
                </p>
              ) : null}
              <div className="mt-3 max-w-sm">
                <ConfidenceBar value={s.confidence} label="Chain attribution" size="sm" />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
