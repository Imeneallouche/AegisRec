import React from "react";
import { Link } from "react-router-dom";
import { PlugZap, RefreshCw, Settings as SettingsIcon, Activity } from "lucide-react";

import { useEngine } from "../../context/EngineContext";
import { useSettings } from "../../context/SettingsContext";

/**
 * Fallback screen shown whenever the detection engine is unreachable, in a
 * degraded state, or still loading its first snapshot.
 *
 * Props:
 *   - title / description — optional overrides for copy
 *   - compact             — slimmer variant used inside cards
 */
export default function EngineOfflineState({ title, description, compact = false }) {
  const { status, error, refresh, isLoading } = useEngine();
  const { settings } = useSettings();
  const [busy, setBusy] = React.useState(false);

  const onRetry = async () => {
    setBusy(true);
    try {
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const copy = resolveCopy(status, { title, description });

  return (
    <div
      className={[
        "flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-center shadow-sm ring-1 ring-slate-100/60",
        compact ? "px-6 py-10" : "px-8 py-16",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div
        className={[
          "mb-5 flex items-center justify-center rounded-2xl",
          status === "offline"
            ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200/70"
            : status === "degraded"
            ? "bg-amber-50 text-amber-600 ring-1 ring-amber-200/70"
            : "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/70",
          compact ? "h-10 w-10" : "h-14 w-14",
        ].join(" ")}
      >
        {isLoading || status === "loading" || status === "idle" ? (
          <Activity className={compact ? "h-5 w-5 animate-pulse" : "h-7 w-7 animate-pulse"} />
        ) : (
          <PlugZap className={compact ? "h-5 w-5" : "h-7 w-7"} />
        )}
      </div>

      <h2 className={`font-semibold text-slate-900 ${compact ? "text-base" : "text-lg"}`}>
        {copy.title}
      </h2>
      <p className={`mt-2 max-w-xl text-slate-500 ${compact ? "text-xs leading-relaxed" : "text-sm leading-7"}`}>
        {copy.description}
      </p>

      {status !== "loading" && status !== "idle" ? (
        <dl className="mt-6 w-full max-w-md overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70 text-left text-xs text-slate-600 shadow-sm">
          <div className="grid grid-cols-[auto,1fr] gap-x-4 px-4 py-2.5">
            <dt className="font-medium text-slate-500">Engine URL</dt>
            <dd className="truncate font-mono text-slate-800">{settings.engine.baseUrl}</dd>
          </div>
          <div className="grid grid-cols-[auto,1fr] gap-x-4 border-t border-slate-100 px-4 py-2.5">
            <dt className="font-medium text-slate-500">Poll interval</dt>
            <dd className="text-slate-800">every {settings.engine.pollIntervalSec}s</dd>
          </div>
          <div className="grid grid-cols-[auto,1fr] gap-x-4 border-t border-slate-100 px-4 py-2.5">
            <dt className="font-medium text-slate-500">Status</dt>
            <dd className="font-medium uppercase tracking-wider text-slate-700">{status}</dd>
          </div>
          {error ? (
            <div className="grid grid-cols-[auto,1fr] gap-x-4 border-t border-slate-100 px-4 py-2.5">
              <dt className="font-medium text-slate-500">Last error</dt>
              <dd className="truncate font-mono text-rose-600" title={error}>
                {error}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          disabled={busy || isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${busy || isLoading ? "animate-spin" : ""}`} />
          {busy || isLoading ? "Reconnecting…" : "Retry connection"}
        </button>
        <Link
          to="/Settings"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <SettingsIcon className="h-4 w-4" />
          Configure engine
        </Link>
      </div>

      {status === "offline" ? (
        <p className="mt-5 max-w-xl text-[0.7rem] leading-relaxed text-slate-400">
          Tip: start the learning service with <span className="font-mono">python -m learning.cli serve</span>{" "}
          inside the detection-engine repository, or enable demo mode in Settings to explore the UI with
          bundled sample data.
        </p>
      ) : null}
    </div>
  );
}

function resolveCopy(status, overrides) {
  if (overrides?.title && overrides?.description) return overrides;
  switch (status) {
    case "offline":
      return {
        title: overrides?.title ?? "Detection engine not connected",
        description:
          overrides?.description ??
          "AegisRec can't reach the learning service right now. Live detections, chains, and mitigation recommendations will appear here as soon as the engine is available.",
      };
    case "degraded":
      return {
        title: overrides?.title ?? "Engine online — data plumbing unavailable",
        description:
          overrides?.description ??
          "The learning service is responding to health checks but hasn't produced a snapshot yet. This usually means Elasticsearch is catching up or the orchestrator is still warming its buffers.",
      };
    case "loading":
    case "idle":
      return {
        title: overrides?.title ?? "Connecting to the detection engine…",
        description:
          overrides?.description ??
          "Waiting for the first snapshot from the learning service. This normally takes a few seconds.",
      };
    default:
      return {
        title: overrides?.title ?? "Waiting for detection data",
        description:
          overrides?.description ??
          "No data received from the engine yet. We'll refresh automatically.",
      };
  }
}
