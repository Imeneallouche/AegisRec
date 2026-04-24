import React from "react";

import PageShell from "../components/ui/PageShell";
import SearchInput, { Segmented } from "../components/ui/SearchInput";
import StatCard from "../components/ui/StatCard";
import AlertsTable from "../components/detection/AlertsTable";
import AlertDetailDrawer from "../components/detection/AlertDetailDrawer";
import ChainDetailDrawer from "../components/detection/ChainDetailDrawer";
import MitigationDetailDrawer from "../components/detection/MitigationDetailDrawer";
import EmptyState from "../components/ui/EmptyState";
import { IconNavBell } from "../data/icons";
import { Bell, ShieldAlert, ShieldCheck, Activity } from "lucide-react";
import { ALERTS, tacticOf } from "../data/detectionSample";

const SEVERITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const TRIAGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "escalate", label: "Escalate" },
  { value: "review", label: "Review" },
  { value: "monitor", label: "Monitor" },
  { value: "drop", label: "Drop" },
];

function countBy(list, key) {
  return list.reduce((acc, x) => {
    const k = x[key];
    if (!k) return acc;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

export default function Alerts() {
  const [severity, setSeverity] = React.useState("all");
  const [triage, setTriage] = React.useState("all");
  const [tacticFilter, setTacticFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [drawerAlert, setDrawerAlert] = React.useState(null);
  const [drawerChain, setDrawerChain] = React.useState(null);
  const [drawerMitigation, setDrawerMitigation] = React.useState(null);

  const tacticCounts = React.useMemo(() => {
    const counts = {};
    ALERTS.forEach((a) => (a.tacticIds || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALERTS.filter((a) => {
      if (severity !== "all" && a.severity !== severity) return false;
      if (triage !== "all" && a.layerC?.action !== triage) return false;
      if (tacticFilter !== "all" && !(a.tacticIds || []).includes(tacticFilter)) return false;
      if (!q) return true;
      const hay = [
        a.id,
        a.message,
        a.assetId,
        a.datacomponent,
        ...(a.tacticIds || []),
        ...(a.techniqueIds || []),
        a.chainId || "",
        ...(a.srcIps || []),
        ...(a.destIps || []),
        a.rawLog || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [severity, triage, tacticFilter, query]);

  const bySeverity = countBy(ALERTS, "severity");
  const safetyRailTriggers = ALERTS.filter((a) => a.layerA?.usedSafetyRail || a.layerC?.usedSafetyRail).length;

  return (
    <PageShell
      title="Alerts"
      subtitle="Every orchestrated decision (Layer A → B → C) with its reasoning and evidence"
      icon={IconNavBell}
    >
      {/* Top KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Total alerts" value={ALERTS.length} icon={Bell} tone="indigo" />
        <StatCard title="Critical" value={bySeverity.critical || 0} icon={ShieldAlert} tone="red" />
        <StatCard title="High" value={bySeverity.high || 0} icon={ShieldAlert} tone="rose" />
        <StatCard title="Safety-rail triggers" value={safetyRailTriggers} icon={ShieldCheck} tone="amber" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by message, asset, technique, IP…"
            className="lg:max-w-xl"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Segmented options={SEVERITY_OPTIONS} value={severity} onChange={setSeverity} />
            <Segmented options={TRIAGE_OPTIONS} value={triage} onChange={setTriage} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="mr-1 font-medium uppercase tracking-wider">Tactic:</span>
          <button
            type="button"
            onClick={() => setTacticFilter("all")}
            className={[
              "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide transition",
              tacticFilter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-50 text-slate-600 ring-1 ring-slate-200/70 hover:bg-slate-100",
            ].join(" ")}
          >
            All
          </button>
          {tacticCounts.map(([t, c]) => {
            const name = tacticOf(t).name;
            const active = tacticFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTacticFilter(t)}
                className={[
                  "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide transition",
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-50 text-slate-600 ring-1 ring-slate-200/70 hover:bg-slate-100",
                ].join(" ")}
              >
                {name} · {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Activity className="h-3.5 w-3.5 text-slate-400" />
          Showing <span className="mx-1 font-semibold text-slate-700">{filtered.length}</span> of {ALERTS.length} alerts
        </span>
        <span className="hidden md:inline">Click a row to inspect layer-by-layer reasoning</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts match your filters"
          description="Adjust severity, triage, or tactic filters — or clear your search term."
        />
      ) : (
        <AlertsTable alerts={filtered} onOpen={(a) => setDrawerAlert(a)} />
      )}

      <AlertDetailDrawer
        alert={drawerAlert}
        open={!!drawerAlert}
        onClose={() => setDrawerAlert(null)}
        onOpenChain={(c) => {
          setDrawerAlert(null);
          setDrawerChain(c);
        }}
        onOpenMitigation={(m) => {
          setDrawerAlert(null);
          setDrawerMitigation(m);
        }}
      />
      <ChainDetailDrawer
        chain={drawerChain}
        open={!!drawerChain}
        onClose={() => setDrawerChain(null)}
        onOpenAlert={(a) => {
          setDrawerChain(null);
          setDrawerAlert(a);
        }}
        onOpenMitigation={(m) => {
          setDrawerChain(null);
          setDrawerMitigation(m);
        }}
      />
      <MitigationDetailDrawer
        mitigation={drawerMitigation}
        open={!!drawerMitigation}
        onClose={() => setDrawerMitigation(null)}
        onOpenAlert={(a) => {
          setDrawerMitigation(null);
          setDrawerAlert(a);
        }}
        onOpenChain={(c) => {
          setDrawerMitigation(null);
          setDrawerChain(c);
        }}
      />
    </PageShell>
  );
}
