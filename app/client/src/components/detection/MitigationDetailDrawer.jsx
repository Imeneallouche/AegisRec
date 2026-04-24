import Drawer, { DrawerField, DrawerSection } from "../ui/Drawer";
import { SeverityBadge, StatusBadge } from "../ui/Badge";
import { TechniqueChip, AssetChip } from "./TacticChip";
import { formatDateTime } from "../ui/formatters";
import { getChainById, ALERTS } from "../../data/detectionSample";
import { MiniAlertRow } from "./AlertsTable";
import { CheckCircle2, AlertTriangle, Undo2, BookOpen } from "lucide-react";

export default function MitigationDetailDrawer({ mitigation: m, open, onClose, onOpenAlert, onOpenChain }) {
  if (!m) return null;
  const chain = m.chainId ? getChainById(m.chainId) : null;
  const relatedAlerts = ALERTS.filter((a) => (m.alertIds || []).includes(a.id));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={m.title}
      subtitle={`${m.id} • ${m.kgMitigationId} ${m.kgMitigationName}`}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={m.status} size="md" />
        <SeverityBadge severity={m.priority} size="md" />
        {m.requiresHumanApproval ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200/70">
            <AlertTriangle className="h-3 w-3" /> human approval required
          </span>
        ) : null}
        {chain ? (
          <button
            type="button"
            onClick={() => onOpenChain?.(chain)}
            className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/70 transition hover:bg-indigo-100"
          >
            {chain.id} →
          </button>
        ) : null}
      </div>

      <DrawerSection title="Rationale">
        <p className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700">
          {m.rationale}
        </p>
      </DrawerSection>

      <DrawerSection title="Where to apply">
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">Assets</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {(m.appliesToAssets || []).map((a) => (
              <AssetChip key={a} id={a} />
            ))}
          </div>
          <p className="mt-3 mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">Zones</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {(m.appliesToZones || []).map((z) => (
              <span key={z} className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/60">
                {z}
              </span>
            ))}
          </div>
          <p className="mt-3 mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">Techniques addressed</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {(m.appliesToTechniques || []).map((t) => (
              <TechniqueChip key={t} id={t} />
            ))}
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Implementation plan">
        <ol className="space-y-2">
          {(m.implementation || []).map((step, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[0.7rem] font-semibold text-indigo-700 ring-1 ring-indigo-200/70">
                {i + 1}
              </span>
              <p className="text-sm text-slate-700">{step}</p>
            </li>
          ))}
        </ol>
      </DrawerSection>

      <DrawerSection title="Rollback plan">
        <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <Undo2 className="h-3.5 w-3.5" />
          </span>
          <p className="text-sm text-slate-700">{m.rollback || "—"}</p>
        </div>
      </DrawerSection>

      {relatedAlerts.length > 0 ? (
        <DrawerSection title={`Related alerts (${relatedAlerts.length})`}>
          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            {relatedAlerts.map((a) => (
              <MiniAlertRow key={a.id} alert={a} onOpen={() => onOpenAlert?.(a)} />
            ))}
          </div>
        </DrawerSection>
      ) : null}

      <DrawerSection title="Grounding & sources">
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <BookOpen className="h-4 w-4 text-slate-400" />
            <span className="font-medium">Knowledge-graph path:</span>
            <span className="font-mono text-slate-800">
              {(m.grounding?.kgPath || []).join("  →  ")}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {(m.sources || []).map((s, idx) => (
              <div key={`${s.type}-${s.id}-${idx}`} className="flex items-center justify-between text-xs text-slate-700">
                <span>
                  <span className="font-medium">{s.type}</span> · {s.id}
                </span>
                <span className="text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
          <DrawerField label="Retrieved at" value={formatDateTime(m.grounding?.retrievedAt)} />
        </div>
      </DrawerSection>

      <DrawerSection title="Actions">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <CheckCircle2 className="h-4 w-4" /> Approve
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Assign to analyst
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Export plan
          </button>
        </div>
      </DrawerSection>
    </Drawer>
  );
}
