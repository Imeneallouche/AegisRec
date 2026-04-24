import React from "react";
import { useLocation } from "react-router-dom";

import PageShell from "../components/ui/PageShell";
import { Segmented } from "../components/ui/SearchInput";
import SearchInput from "../components/ui/SearchInput";
import EmptyState from "../components/ui/EmptyState";
import ChainCard from "../components/detection/ChainCard";
import ChainDetailDrawer from "../components/detection/ChainDetailDrawer";
import AlertDetailDrawer from "../components/detection/AlertDetailDrawer";
import MitigationDetailDrawer from "../components/detection/MitigationDetailDrawer";
import { IconNavTtp } from "../data/icons";
import { Target } from "lucide-react";
import { useEngine } from "../context/EngineContext";
import EngineOfflineState from "../components/ui/EngineOfflineState";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "monitoring", label: "Monitoring" },
  { value: "contained", label: "Contained" },
];

export default function TTPs() {
  const location = useLocation();
  const deepLinkId = location.state?.chainId;

  const { data, isConnected } = useEngine();
  const CHAINS = React.useMemo(() => data.chains || [], [data.chains]);

  const [statusFilter, setStatusFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [drawerAlert, setDrawerAlert] = React.useState(null);
  const [drawerMitigation, setDrawerMitigation] = React.useState(null);

  React.useEffect(() => {
    if (deepLinkId) {
      const c = CHAINS.find((ch) => ch.id === deepLinkId);
      if (c) setSelected(c);
    }
  }, [deepLinkId, CHAINS]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHAINS.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        c.name,
        c.summary,
        c.id,
        ...(c.techniques || []),
        ...(c.tactics || []),
        ...(c.targetAssets || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [statusFilter, query, CHAINS]);

  if (!isConnected) {
    return (
      <PageShell
        title="Attack chains"
        subtitle="Causal-window Transformer recognitions (Layer B) grouped by kill-chain progression"
        icon={IconNavTtp}
      >
        <EngineOfflineState />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Attack chains"
      subtitle="Causal-window Transformer recognitions (Layer B) grouped by kill-chain progression"
      icon={IconNavTtp}
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/60 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name, technique, asset, or keyword…"
          className="sm:max-w-lg"
        />
        <Segmented
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No attack chains match your filters"
          description="Try clearing the search term or switching to ‘All’ to see every chain the engine has recognised."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filtered.map((c) => (
            <ChainCard key={c.id} chain={c} onOpen={() => setSelected(c)} />
          ))}
        </div>
      )}

      <ChainDetailDrawer
        chain={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onOpenAlert={(a) => setDrawerAlert(a)}
        onOpenMitigation={(m) => setDrawerMitigation(m)}
      />
      <AlertDetailDrawer
        alert={drawerAlert}
        open={!!drawerAlert}
        onClose={() => setDrawerAlert(null)}
        onOpenChain={(c) => {
          setDrawerAlert(null);
          setSelected(c);
        }}
        onOpenMitigation={(m) => {
          setDrawerAlert(null);
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
          setSelected(c);
        }}
      />
    </PageShell>
  );
}
