import React from "react";

import PageShell from "../components/ui/PageShell";
import SearchInput, { Segmented } from "../components/ui/SearchInput";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import MitigationCard from "../components/detection/MitigationCard";
import MitigationDetailDrawer from "../components/detection/MitigationDetailDrawer";
import AlertDetailDrawer from "../components/detection/AlertDetailDrawer";
import ChainDetailDrawer from "../components/detection/ChainDetailDrawer";
import { IconNavShield } from "../data/icons";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { MITIGATIONS } from "../data/detectionSample";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "proposed", label: "Proposed" },
  { value: "approved", label: "Approved" },
  { value: "implemented", label: "Implemented" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
];

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function groupByPriority(list) {
  const groups = { critical: [], high: [], medium: [], low: [] };
  list.forEach((m) => {
    (groups[m.priority] || groups.medium).push(m);
  });
  return Object.entries(groups)
    .filter(([, arr]) => arr.length > 0)
    .sort((a, b) => PRIORITY_ORDER[a[0]] - PRIORITY_ORDER[b[0]]);
}

const PRIORITY_LABEL = {
  critical: "Critical priority",
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

export default function Mitigations() {
  const [status, setStatus] = React.useState("all");
  const [priority, setPriority] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [drawerAlert, setDrawerAlert] = React.useState(null);
  const [drawerChain, setDrawerChain] = React.useState(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return MITIGATIONS.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (priority !== "all" && m.priority !== priority) return false;
      if (!q) return true;
      const hay = [
        m.title,
        m.rationale,
        m.id,
        m.chainId || "",
        m.kgMitigationId || "",
        m.kgMitigationName || "",
        ...(m.appliesToAssets || []),
        ...(m.appliesToTechniques || []),
        ...(m.appliesToZones || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [status, priority, query]);

  const grouped = React.useMemo(() => groupByPriority(filtered), [filtered]);

  const approvalCount = MITIGATIONS.filter((m) => m.requiresHumanApproval && m.status !== "implemented").length;
  const implementedCount = MITIGATIONS.filter((m) => m.status === "implemented").length;
  const kgGrounded = MITIGATIONS.filter((m) => !!m.kgMitigationId).length;
  const kgCoverage = MITIGATIONS.length ? kgGrounded / MITIGATIONS.length : 0;

  return (
    <PageShell
      title="Mitigations"
      subtitle="KG-grounded, LLM-generated mitigation plans (Layer D) — reviewed and tracked to implementation"
      icon={IconNavShield}
    >
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="Total plans"
          value={MITIGATIONS.length}
          icon={ShieldCheck}
          tone="indigo"
        />
        <StatCard
          title="Awaiting approval"
          value={approvalCount}
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          title="Implemented"
          value={implementedCount}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          title="KG-grounded"
          value={`${Math.round(kgCoverage * 100)}%`}
          hint={`${kgGrounded} / ${MITIGATIONS.length}`}
          icon={BookOpen}
          tone="sky"
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by title, technique, asset, MITRE mitigation…"
          className="lg:max-w-xl"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          <Segmented options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />
        </div>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No mitigations match your filters"
          description="Try ‘All’ for both status and priority, or clear the search term."
        />
      ) : (
        <div className="space-y-7">
          {grouped.map(([prio, items]) => (
            <section key={prio}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-sm font-semibold text-slate-900">{PRIORITY_LABEL[prio]}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600">
                  {items.length}
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {items.map((m) => (
                  <MitigationCard
                    key={m.id}
                    mitigation={m}
                    onOpen={() => setSelected(m)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <MitigationDetailDrawer
        mitigation={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onOpenAlert={(a) => {
          setSelected(null);
          setDrawerAlert(a);
        }}
        onOpenChain={(c) => {
          setSelected(null);
          setDrawerChain(c);
        }}
      />
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
          setSelected(m);
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
          setSelected(m);
        }}
      />
    </PageShell>
  );
}
