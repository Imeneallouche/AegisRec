import React from "react";

import PageShell from "../components/ui/PageShell";
import SearchInput, { Segmented } from "../components/ui/SearchInput";
import StatCard from "../components/ui/StatCard";
import LogStream from "../components/detection/LogStream";
import AlertDetailDrawer from "../components/detection/AlertDetailDrawer";
import EmptyState from "../components/ui/EmptyState";
import { IconNavLogs } from "../data/icons";
import { Files, AlertCircle, Cpu, ShieldAlert } from "lucide-react";
import { assetOf } from "../data/detectionSample";
import { useEngine } from "../context/EngineContext";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { siteApi } from "../api/siteApi";

const LEVEL_OPTIONS = [
  { value: "all", label: "All" },
  { value: "alert", label: "Alert" },
  { value: "warn", label: "Warn" },
  { value: "info", label: "Info" },
];

export default function Monitoring() {
  const { token } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { data } = useEngine();
  const ALERTS = React.useMemo(() => data.alerts || [], [data.alerts]);

  const minutes = Math.max(1, Math.min(Number(settings.logMonitoring?.recentWindowMinutes) || 5, 1440));

  const [logs, setLogs] = React.useState([]);
  const [esHealth, setEsHealth] = React.useState(null);
  const [loadError, setLoadError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const [level, setLevel] = React.useState("all");
  const [asset, setAsset] = React.useState("all");
  const [dc, setDc] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [paused, setPaused] = React.useState(false);
  const [drawerAlert, setDrawerAlert] = React.useState(null);

  const refreshLogs = React.useCallback(async () => {
    if (!token) {
      setLoading(false);
      setLoadError("Not signed in.");
      return;
    }
    const m = Math.max(1, Math.min(Number(settings.logMonitoring?.recentWindowMinutes) || 5, 1440));
    setLoadError(null);
    try {
      const [health, body] = await Promise.all([
        siteApi.getElasticsearchHealth(token),
        siteApi.getRecentLogs(token, m),
      ]);
      setEsHealth(health);
      setLogs(Array.isArray(body?.logs) ? body.logs : []);
    } catch (err) {
      setEsHealth(null);
      setLogs([]);
      setLoadError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [token, settings.logMonitoring?.recentWindowMinutes]);

  React.useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  React.useEffect(() => {
    const ms = Math.max(5000, Math.min(Number(settings.engine?.pollIntervalSec) || 15, 120) * 1000);
    const id = window.setInterval(() => {
      if (!paused && token) refreshLogs();
    }, ms);
    return () => window.clearInterval(id);
  }, [refreshLogs, paused, token, settings.engine?.pollIntervalSec]);

  const sortedLogs = React.useMemo(
    () => [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [logs]
  );

  const assetOptions = React.useMemo(() => {
    const ids = [...new Set(logs.map((l) => l.assetId).filter(Boolean))].sort();
    return ids;
  }, [logs]);

  const dcOptions = React.useMemo(() => {
    const ids = [...new Set(logs.map((l) => l.datacomponent).filter(Boolean))].sort();
    return ids;
  }, [logs]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedLogs.filter((l) => {
      if (level !== "all" && l.level !== level) return false;
      if (asset !== "all" && l.assetId !== asset) return false;
      if (dc !== "all" && l.datacomponent !== dc) return false;
      if (!q) return true;
      const hay = [l.message, l.source, l.assetId, l.datacomponent || "", l.alertId || ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sortedLogs, level, asset, dc, query]);

  const bySource = React.useMemo(() => {
    const counts = {};
    logs.forEach((l) => {
      counts[l.source] = (counts[l.source] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [logs]);

  const correlatedCount = logs.filter((l) => !!l.alertId).length;

  const openAlertById = (alertId) => {
    const a = ALERTS.find((x) => String(x.id) === String(alertId));
    if (a) setDrawerAlert(a);
  };

  const esOk = !!esHealth?.ok && !!esHealth?.cluster;
  const clusterStatus = esHealth?.cluster?.status || esHealth?.cluster?.cluster_status || "—";

  return (
    <PageShell
      title="Log monitoring"
      subtitle={`Recent events from Elasticsearch (last ${minutes} min). Stored detections remain in the AegisRec database.`}
      icon={IconNavLogs}
      fullHeight
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-hidden">
        {loadError ? (
          <div className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 [overflow-wrap:anywhere]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-semibold">
                  {/HTTP 404/.test(loadError)
                    ? "AegisRec API not reached (HTTP 404)"
                    : /HTTP 503|Elasticsearch HTTP/i.test(loadError)
                    ? "Elasticsearch query failed"
                    : "Log monitoring request failed"}
                  .
                </span>{" "}
                <span className="text-rose-700 [overflow-wrap:anywhere]">{loadError}</span>
                {/HTTP 404/.test(loadError) ? (
                  <p className="mt-2 text-xs text-rose-800/90">
                    Log lines are loaded through the AegisRec server, which then queries Elasticsearch. A 404 with{" "}
                    <code className="rounded bg-rose-100/80 px-1">detail: &quot;Not Found&quot;</code> usually means the
                    browser called the wrong host (for example the MITRE API on port 8090). Use{" "}
                    <code className="rounded bg-rose-100/80 px-1">./start-dev.sh</code> or set{" "}
                    <code className="rounded bg-rose-100/80 px-1">REACT_APP_AEGISREC_API_URL=http://127.0.0.1:8000</code>.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  refreshLogs();
                }}
                className="shrink-0 text-xs font-semibold text-rose-900 underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        <div className="shrink-0 space-y-4">
          <div className="flex max-w-full min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm ring-1 ring-slate-100/60">
            <label className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-500">Window (this page)</span>
              <input
                type="number"
                min={1}
                max={1440}
                value={minutes}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(1440, Number(e.target.value) || 5));
                  updateSettings({ logMonitoring: { ...settings.logMonitoring, recentWindowMinutes: v } });
                }}
                className="w-24 rounded-lg border border-slate-200 px-2 py-1 font-mono text-slate-800 shadow-sm"
              />
              <span>minutes · saved in browser settings</span>
            </label>
            <span
              className={`shrink-0 font-semibold [overflow-wrap:anywhere] ${esOk ? "text-emerald-700" : "text-rose-700"}`}
            >
              ES cluster: {clusterStatus}
            </span>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            <StatCard
              title="Events (window)"
              value={loading ? "…" : logs.length}
              icon={Files}
              tone="indigo"
            />
            <StatCard
              title="Correlated to alerts"
              value={loading ? "…" : correlatedCount}
              hint={logs.length ? `${Math.round((correlatedCount / logs.length) * 100)}% of feed` : "no logs"}
              icon={AlertCircle}
              tone="rose"
            />
            <StatCard
              title="Distinct assets"
              value={loading ? "…" : new Set(logs.map((l) => l.assetId)).size}
              icon={Cpu}
              tone="sky"
            />
          <StatCard
            title="Detection-ready DCs"
            value={loading ? "…" : new Set(logs.filter((l) => l.datacomponent).map((l) => l.datacomponent)).size}
            icon={ShieldAlert}
            tone="emerald"
          />
        </div>

        <div className="flex min-w-0 max-w-full flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search messages, sources, assets, alert IDs…"
              className="w-full min-w-0 lg:max-w-xl"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Segmented options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                className={[
                  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition",
                  paused ? "text-emerald-600 hover:bg-emerald-50" : "text-rose-600 hover:bg-rose-50",
                ].join(" ")}
              >
                {paused ? "Resume polling" : "Pause polling"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-0 max-w-full flex-col gap-1 text-xs font-medium text-slate-500 sm:flex-row sm:items-center sm:gap-2">
              <span className="shrink-0">Asset</span>
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="max-w-[min(100%,14rem)] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="all">All assets</option>
                {assetOptions.map((id) => (
                  <option key={id} value={id}>
                    {assetOf(id).name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 max-w-full flex-col gap-1 text-xs font-medium text-slate-500 sm:flex-row sm:items-center sm:gap-2">
              <span className="shrink-0">Data component</span>
              <select
                value={dc}
                onChange={(e) => setDc(e.target.value)}
                className="max-w-[min(100%,14rem)] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="all">All data components</option>
                {dcOptions.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <div className="ml-auto hidden min-w-0 text-xs text-slate-500 md:block">
              Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {logs.length}{" "}
              events
            </div>
          </div>
        </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden xl:flex-row xl:items-stretch xl:gap-6">
          <section className="order-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden max-xl:min-h-[min(48vh,26rem)] xl:order-1">
            {!loadError && !loading && logs.length === 0 ? (
              <EmptyState
                className="min-h-[14rem] flex-1 justify-center py-10 sm:min-h-[18rem]"
                icon={Files}
                title="No logs in this time window"
                description={`Elasticsearch returned no documents in the last ${minutes} minutes for the configured index pattern. Increase the window above or verify ingest.`}
              />
            ) : (
              <>
                <LogStream
                  className="h-full min-h-0 flex-1 xl:min-h-0"
                  logs={loadError ? [] : filtered}
                  onInspectAlert={openAlertById}
                />
                {paused && !loadError ? (
                  <div className="mt-2 shrink-0 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-center text-[0.7rem] font-medium text-amber-900">
                    Polling paused — view is frozen; resume to fetch fresh events from Elasticsearch.
                  </div>
                ) : null}
              </>
            )}
          </section>

          <aside className="order-1 flex w-full min-w-0 shrink-0 flex-col gap-4 max-xl:max-h-[40vh] max-xl:overflow-y-auto max-xl:overscroll-contain xl:order-2 xl:max-h-none xl:w-72 xl:max-w-[min(100%,21rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60 sm:p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Top sources</h3>
            {bySource.length === 0 ? (
              <p className="text-xs text-slate-500">No events in the current window.</p>
            ) : (
              <ul className="space-y-2">
                {bySource.slice(0, 6).map(([src, n]) => (
                  <li key={src} className="flex min-w-0 items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 flex-1 break-all font-mono text-slate-700">{src}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60 sm:p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Top talkers (assets)</h3>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500">No events in the current window.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {Object.entries(
                  logs.reduce((acc, l) => {
                    acc[l.assetId] = (acc[l.assetId] || 0) + 1;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([id, n]) => (
                    <li key={id} className="flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-slate-700">{assetOf(id).name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{n}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60 sm:p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Ingestion pipeline</h3>
            <ul className="list-none space-y-2.5 pl-0 text-xs text-slate-700">
              <PipelineRow label="Filebeat" ok />
              <PipelineRow label="Suricata" ok />
              <PipelineRow label="Logstash" ok />
              <PipelineRow label="Elasticsearch" ok={esOk} value={clusterStatus} />
              <PipelineRow
                label="Detection engine"
                ok={null}
                value="Data in AegisRec DB / optional live service — not required for this view"
              />
            </ul>
            </section>
          </aside>
        </div>
      </div>

      <AlertDetailDrawer alert={drawerAlert} open={!!drawerAlert} onClose={() => setDrawerAlert(null)} />
    </PageShell>
  );
}

function PipelineRow({ label, ok = true, value }) {
  const tone =
    ok === null ? "text-slate-600" : ok ? "text-emerald-600" : "text-rose-600";
  const dot =
    ok === null ? "bg-slate-400" : ok ? "bg-emerald-500" : "bg-rose-500";
  return (
    <li className="flex min-w-0 items-center justify-between gap-2">
      <span className="shrink-0 text-slate-600">{label}</span>
      <span
        className={`inline-flex min-w-0 max-w-[min(14rem,45vw)] items-center justify-end gap-1 sm:max-w-[12rem] ${tone}`}
      >
        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span className="truncate text-right [overflow-wrap:anywhere]">{value || (ok ? "online" : "offline")}</span>
      </span>
    </li>
  );
}
