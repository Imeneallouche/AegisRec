import React from "react";

import PageShell from "../components/ui/PageShell";
import SearchInput, { Segmented } from "../components/ui/SearchInput";
import StatCard from "../components/ui/StatCard";
import LogStream from "../components/detection/LogStream";
import AlertDetailDrawer from "../components/detection/AlertDetailDrawer";
import { IconNavLogs } from "../data/icons";
import { Files, AlertCircle, Cpu, ShieldAlert } from "lucide-react";
import { ASSETS, DATA_COMPONENTS, assetOf } from "../data/detectionSample";
import { useEngine } from "../context/EngineContext";
import EngineOfflineState from "../components/ui/EngineOfflineState";

const LEVEL_OPTIONS = [
  { value: "all", label: "All" },
  { value: "alert", label: "Alert" },
  { value: "warn", label: "Warn" },
  { value: "info", label: "Info" },
];

export default function Monitoring() {
  const { data, health, isConnected } = useEngine();
  const LOGS = React.useMemo(() => data.logs || [], [data.logs]);
  const ALERTS = React.useMemo(() => data.alerts || [], [data.alerts]);

  const [level, setLevel] = React.useState("all");
  const [asset, setAsset] = React.useState("all");
  const [dc, setDc] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [paused, setPaused] = React.useState(false);
  const [drawerAlert, setDrawerAlert] = React.useState(null);

  const sortedLogs = React.useMemo(
    () => [...LOGS].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [LOGS]
  );

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
    LOGS.forEach((l) => {
      counts[l.source] = (counts[l.source] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [LOGS]);

  const correlatedCount = LOGS.filter((l) => !!l.alertId).length;

  const openAlertById = (alertId) => {
    const a = ALERTS.find((x) => x.id === alertId);
    if (a) setDrawerAlert(a);
  };

  if (!isConnected) {
    return (
      <PageShell
        title="Log monitoring"
        subtitle="Normalised ingestion feed that powers the detection engine"
        icon={IconNavLogs}
      >
        <EngineOfflineState />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Log monitoring"
      subtitle="Normalised ingestion feed that powers the detection engine (Elasticsearch • Filebeat • Suricata • WinLogbeat)"
      icon={IconNavLogs}
      fullHeight
    >
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        <StatCard title="Events ingested" value={LOGS.length} icon={Files} tone="indigo" />
        <StatCard
          title="Correlated to alerts"
          value={correlatedCount}
          hint={LOGS.length ? `${Math.round((correlatedCount / LOGS.length) * 100)}% of feed` : "no logs"}
          icon={AlertCircle}
          tone="rose"
        />
        <StatCard title="Distinct assets" value={new Set(LOGS.map((l) => l.assetId)).size} icon={Cpu} tone="sky" />
        <StatCard
          title="Detection-ready DCs"
          value={new Set(LOGS.filter((l) => l.datacomponent).map((l) => l.datacomponent)).size}
          icon={ShieldAlert}
          tone="emerald"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search messages, sources, assets, alert IDs…"
            className="lg:max-w-xl"
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
              {paused ? "Resume stream" : "Pause stream"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            Asset
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All assets</option>
              {Object.values(ASSETS).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            Data component
            <select
              value={dc}
              onChange={(e) => setDc(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All data components</option>
              {Object.values(DATA_COMPONENTS).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} · {d.name}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto hidden text-xs text-slate-500 md:block">
            Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {LOGS.length} events
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[1fr,20rem]">
        <div className="flex min-h-0 flex-col gap-3">
          <LogStream
            logs={paused ? [] : filtered}
            onInspectAlert={openAlertById}
          />
          {paused ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-center text-xs text-slate-500">
              Stream paused. Resume to see incoming events.
            </div>
          ) : null}
        </div>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/60">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Top sources</h3>
            {bySource.length === 0 ? (
              <p className="text-xs text-slate-500">No events yet.</p>
            ) : (
              <ul className="space-y-2">
                {bySource.slice(0, 6).map(([src, n]) => (
                  <li key={src} className="flex items-center justify-between text-xs">
                    <span className="truncate font-mono text-slate-700">{src}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/60">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Top talkers (assets)</h3>
            {LOGS.length === 0 ? (
              <p className="text-xs text-slate-500">No events yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {Object.entries(
                  LOGS.reduce((acc, l) => {
                    acc[l.assetId] = (acc[l.assetId] || 0) + 1;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([id, n]) => (
                    <li key={id} className="flex items-center justify-between">
                      <span className="truncate text-slate-700">{assetOf(id).name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{n}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/60">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Ingestion pipeline</h3>
            <ul className="space-y-2.5 text-xs text-slate-700">
              <PipelineRow label="Filebeat" ok />
              <PipelineRow label="Suricata" ok />
              <PipelineRow label="Logstash" ok />
              <PipelineRow label="Elasticsearch" ok />
              <PipelineRow
                label="Detection engine"
                ok={!!health?.ok}
                value={health?.ok ? "polling" : "idle"}
              />
            </ul>
          </section>
        </aside>
      </div>

      <AlertDetailDrawer
        alert={drawerAlert}
        open={!!drawerAlert}
        onClose={() => setDrawerAlert(null)}
      />
    </PageShell>
  );
}

function PipelineRow({ label, ok = true, value }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`inline-flex items-center gap-1 ${ok ? "text-emerald-600" : "text-rose-600"}`}>
        <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
        {value || (ok ? "online" : "offline")}
      </span>
    </li>
  );
}
