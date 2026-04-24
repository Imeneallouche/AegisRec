import React from "react";

import PageShell from "../components/ui/PageShell";
import SearchInput, { Segmented } from "../components/ui/SearchInput";
import StatCard from "../components/ui/StatCard";
import LogStream from "../components/detection/LogStream";
import AlertDetailDrawer from "../components/detection/AlertDetailDrawer";
import { IconNavLogs } from "../data/icons";
import { Files, AlertCircle, Cpu, ShieldAlert } from "lucide-react";
import {
  LOGS,
  ALERTS,
  ASSETS,
  DATA_COMPONENTS,
  assetOf,
} from "../data/detectionSample";

const LEVEL_OPTIONS = [
  { value: "all", label: "All" },
  { value: "alert", label: "Alert" },
  { value: "warn", label: "Warn" },
  { value: "info", label: "Info" },
];

export default function Monitoring() {
  const [level, setLevel] = React.useState("all");
  const [asset, setAsset] = React.useState("all");
  const [dc, setDc] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [paused, setPaused] = React.useState(false);
  const [drawerAlert, setDrawerAlert] = React.useState(null);

  const sortedLogs = React.useMemo(
    () => [...LOGS].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    []
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
  }, []);

  const correlatedCount = LOGS.filter((l) => !!l.alertId).length;

  const openAlertById = (alertId) => {
    const a = ALERTS.find((x) => x.id === alertId);
    if (a) setDrawerAlert(a);
  };

  return (
    <PageShell
      title="Log monitoring"
      subtitle="Normalised ingestion feed that powers the detection engine (Elasticsearch • Filebeat • Suricata • WinLogbeat)"
      icon={IconNavLogs}
      fullHeight
    >
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Events ingested" value={LOGS.length} icon={Files} tone="indigo" />
        <StatCard
          title="Correlated to alerts"
          value={correlatedCount}
          hint={`${Math.round((correlatedCount / LOGS.length) * 100)}% of feed`}
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
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60">
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

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr,18rem]">
        <div className="min-h-0">
          <LogStream
            logs={paused ? [] : filtered}
            onInspectAlert={openAlertById}
          />
          {paused ? (
            <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-center text-xs text-slate-500">
              Stream paused. Resume to see incoming events.
            </div>
          ) : null}
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Top sources</h3>
            <ul className="space-y-2">
              {bySource.slice(0, 6).map(([src, n]) => (
                <li key={src} className="flex items-center justify-between text-xs">
                  <span className="truncate font-mono text-slate-700">{src}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{n}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Top talkers (assets)</h3>
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
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Ingestion pipeline</h3>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-center justify-between">
                <span>Filebeat</span>
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> online
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Suricata</span>
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> online
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Logstash</span>
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> online
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Elasticsearch</span>
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> green
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Detection engine</span>
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> polling
                </span>
              </li>
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
