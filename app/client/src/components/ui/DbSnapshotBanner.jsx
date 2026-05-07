import React from "react";
import { Database } from "lucide-react";

import { useEngine } from "../../context/EngineContext";
import { useSettings } from "../../context/SettingsContext";

/**
 * Shown when the live learning/engine service is unavailable or incomplete,
 * while persisted rows may still render from the AegisRec database.
 */
export default function DbSnapshotBanner() {
  const { status, isDemo, isOffline, isDegraded, error } = useEngine();
  const { settings } = useSettings();

  if (settings.engine.demoMode || isDemo) return null;
  if (!isOffline && !isDegraded) return null;

  const detail =
    status === "degraded"
      ? "Snapshot from the engine is unavailable; showing database-backed records. Alerts and attack chains also sync periodically from Elasticsearch into this database when the server can reach your cluster."
      : "The detection engine is not reachable; showing database-backed records. Alerts and attack chains also sync periodically from Elasticsearch into this database when the server can reach your cluster.";

  return (
    <div className="mb-4 flex gap-3 rounded-xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 text-xs text-sky-950 shadow-sm">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 ring-1 ring-sky-200/80">
        <Database className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-sky-900">Database view</p>
        <p className="mt-0.5 leading-relaxed text-sky-800/90">{detail}</p>
        {error ? (
          <p className="mt-1 font-mono text-[0.65rem] text-sky-900/70 [overflow-wrap:anywhere]">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
