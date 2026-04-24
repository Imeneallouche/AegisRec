import Drawer, { DrawerField, DrawerSection } from "../ui/Drawer";
import TacticChip, { TechniqueChip, DataComponentChip } from "./TacticChip";
import { SeverityBadge, StatusBadge, TriageBadge } from "../ui/Badge";
import ConfidenceBar from "../ui/ConfidenceBar";
import { formatDateTime, formatPct } from "../ui/formatters";
import { assetOf } from "../../data/detectionSample";
import { useEngine } from "../../context/EngineContext";

function SectionCard({ children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      {children}
    </div>
  );
}

function LayerBadge({ letter, label, tone }) {
  const tones = {
    indigo:  "bg-indigo-50 text-indigo-700 ring-indigo-200/70",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
    amber:   "bg-amber-50 text-amber-700 ring-amber-200/70",
    rose:    "bg-rose-50 text-rose-700 ring-rose-200/70",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider ring-1 ${tones[tone] || tones.indigo}`}>
      <span className="font-mono text-[0.7rem]">{letter}</span>
      {label}
    </span>
  );
}

export default function AlertDetailDrawer({ alert: a, open, onClose, onOpenChain, onOpenMitigation }) {
  const { data } = useEngine();
  if (!a) return null;
  const asset = assetOf(a.assetId);
  const chain = a.chainId ? data.chains.find((c) => c.id === a.chainId) || null : null;
  const logs = data.logs.filter((l) => l.alertId === a.id);
  const mitigations = (chain ? data.mitigations.filter((m) => m.chainId === chain.id) : []).filter((m) =>
    (m.alertIds || []).includes(a.id)
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={a.message}
      subtitle={`${a.id} • ${asset.name} (${asset.ip})`}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={a.severity} size="md" />
        <TriageBadge action={a.layerC?.action} size="md" />
        {a.chainId ? (
          <button
            type="button"
            onClick={() => chain && onOpenChain?.(chain)}
            className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/70 transition hover:bg-indigo-100"
          >
            {a.chainId} →
          </button>
        ) : null}
        <span className="text-xs text-slate-500">{formatDateTime(a.timestamp)}</span>
      </div>

      <DrawerSection title="Classification">
        <div className="flex flex-wrap items-center gap-1.5">
          {a.tacticIds?.map((t) => <TacticChip key={t} id={t} />)}
          {a.techniqueIds?.map((t) => <TechniqueChip key={t} id={t} />)}
          <DataComponentChip id={a.datacomponent} />
        </div>
      </DrawerSection>

      <DrawerSection title="Layer-by-layer reasoning">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SectionCard>
            <LayerBadge letter="A" label="Alert classifier" tone="indigo" />
            <div className="mt-2">
              <ConfidenceBar value={a.layerA?.pTruePositive || 0} label="p(True Positive)" tone="auto" />
            </div>
            <div className="mt-3 text-xs text-slate-600">
              <DrawerField label="Decision" value={a.layerA?.decision || "—"} />
              <DrawerField label="Safety rail" value={a.layerA?.usedSafetyRail ? "triggered" : "no"} />
              <DrawerField label="Drift alarm" value={a.layerA?.driftAlarm ? "active" : "none"} />
            </div>
          </SectionCard>
          <SectionCard>
            <LayerBadge letter="B" label="Chain attributor" tone="emerald" />
            <div className="mt-2">
              <ConfidenceBar value={a.layerB?.confidence || 0} label="Attribution confidence" tone="indigo" />
            </div>
            <div className="mt-3 text-xs text-slate-600">
              <DrawerField label="Chain" value={a.layerB?.chainId || "—"} mono />
              <DrawerField
                label="Techniques"
                value={(a.layerB?.techniques || []).join(", ") || "—"}
              />
              <DrawerField
                label="Tactics"
                value={(a.layerB?.tactics || []).join(", ") || "—"}
              />
            </div>
          </SectionCard>
          <SectionCard>
            <LayerBadge letter="C" label="Triage policy" tone="amber" />
            <div className="mt-2">
              <ConfidenceBar value={a.layerC?.confidence || 0} label="Policy confidence" tone="indigo" />
            </div>
            <div className="mt-3 text-xs text-slate-600">
              <DrawerField label="Action" value={a.layerC?.action || "—"} />
              <DrawerField label="Rationale" value={a.layerC?.rationale || "—"} />
              <DrawerField label="AVAR hit" value={a.layerC?.avarHit ? "yes" : "no"} />
              <DrawerField label="Safety rail" value={a.layerC?.usedSafetyRail ? "triggered" : "no"} />
            </div>
          </SectionCard>
          <SectionCard>
            <LayerBadge letter="D" label="Mitigation recommender" tone="rose" />
            <p className="mt-2 text-xs text-slate-600">
              {a.layerD?.ready
                ? `${mitigations.length} KG-grounded mitigation(s) prepared for this alert.`
                : "Layer D abstained — insufficient KG retrieval context."}
            </p>
            {mitigations.length > 0 ? (
              <div className="mt-3 space-y-2">
                {mitigations.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onOpenMitigation?.(m)}
                    className="block w-full truncate rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    {m.title}
                  </button>
                ))}
              </div>
            ) : null}
          </SectionCard>
        </div>
      </DrawerSection>

      <DrawerSection title="Network context">
        <SectionCard>
          <DrawerField label="Asset" value={`${asset.name} (${asset.ip})`} />
          <DrawerField label="Zone" value={asset.zone} />
          <DrawerField label="Source IPs" value={(a.srcIps || []).join(", ") || "—"} mono />
          <DrawerField label="Destination IPs" value={(a.destIps || []).join(", ") || "—"} mono />
        </SectionCard>
      </DrawerSection>

      <DrawerSection title="Raw detection record">
        <pre className="overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 font-mono text-[0.7rem] leading-relaxed text-slate-100">
{a.rawLog}
        </pre>
      </DrawerSection>

      <DrawerSection title={`Related logs (${logs.length})`}>
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">No raw logs correlated to this alert.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-wide text-slate-500">
                  <span>{l.source}</span>
                  <span>{formatDateTime(l.timestamp)}</span>
                </div>
                <p className="mt-1 font-mono [overflow-wrap:anywhere]">{l.message}</p>
              </div>
            ))
          )}
        </div>
      </DrawerSection>

      <DrawerSection title="Alert identifier">
        <SectionCard>
          <DrawerField label="Alert ID" value={a.id} mono />
          <DrawerField label="Signal score" value={formatPct(a.signalScore, 1)} />
          {chain ? <DrawerField label="Chain" value={<StatusBadge status={chain.status} />} /> : null}
        </SectionCard>
      </DrawerSection>
    </Drawer>
  );
}
