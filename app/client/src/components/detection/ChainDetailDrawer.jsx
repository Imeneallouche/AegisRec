import Drawer, { DrawerField, DrawerSection } from "../ui/Drawer";
import ChainTimeline from "./ChainTimeline";
import TacticChip, { TechniqueChip, AssetChip } from "./TacticChip";
import { SeverityBadge, StatusBadge } from "../ui/Badge";
import ConfidenceBar from "../ui/ConfidenceBar";
import { formatDateTime, formatPct } from "../ui/formatters";
import {
  getAlertsForChain,
  getMitigationsForChain,
  assetOf,
} from "../../data/detectionSample";
import { MiniAlertRow } from "./AlertsTable";
import MitigationCard from "./MitigationCard";

export default function ChainDetailDrawer({ chain, open, onClose, onOpenAlert, onOpenMitigation }) {
  if (!chain) return null;
  const alerts = getAlertsForChain(chain.id);
  const mitigations = getMitigationsForChain(chain.id);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={chain.name}
      subtitle={`${chain.id} • Recognised by Layer B (causal-window Transformer)`}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={chain.status} size="md" />
        <SeverityBadge severity={chain.severity} size="md" />
        <span className="text-xs text-slate-500">
          Started {formatDateTime(chain.startedAt)} • Last seen {formatDateTime(chain.lastSeenAt)}
        </span>
      </div>

      <DrawerSection title="Summary">
        <p className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700">
          {chain.summary}
        </p>
      </DrawerSection>

      <DrawerSection title="Scoring & progression">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <ConfidenceBar value={chain.confidence} label="Layer B confidence" />
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <ConfidenceBar value={chain.killChainProgress} label="Kill-chain progression" tone="indigo" />
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Tactics & techniques observed">
        <div className="flex flex-wrap items-center gap-1.5">
          {(chain.tactics || []).map((t) => <TacticChip key={t} id={t} />)}
          {(chain.techniques || []).map((t) => <TechniqueChip key={t} id={t} />)}
        </div>
      </DrawerSection>

      <DrawerSection title="Assets involved">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">Attacker</p>
            <p className="font-mono text-sm text-slate-800">{(chain.attackerAssets || []).join(", ") || "—"}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">Targets</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {(chain.targetAssets || []).map((a) => {
                const asset = assetOf(a);
                return <AssetChip key={a} id={asset.name} />;
              })}
            </div>
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="Kill-chain timeline">
        <ChainTimeline steps={chain.steps} />
      </DrawerSection>

      <DrawerSection title={`Alerts in this chain (${alerts.length})`}>
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
          {alerts.map((a) => (
            <MiniAlertRow key={a.id} alert={a} onOpen={() => onOpenAlert?.(a)} />
          ))}
        </div>
      </DrawerSection>

      <DrawerSection title={`Recommended mitigations (${mitigations.length})`}>
        <div className="space-y-3">
          {mitigations.length === 0 ? (
            <p className="text-sm text-slate-500">No mitigations generated yet.</p>
          ) : (
            mitigations.map((m) => (
              <MitigationCard key={m.id} mitigation={m} compact onOpen={() => onOpenMitigation?.(m)} />
            ))
          )}
        </div>
      </DrawerSection>

      <DrawerSection title="Engine metadata">
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <DrawerField label="Chain ID" value={chain.id} mono />
          <DrawerField label="Alerts" value={chain.alertsCount} />
          <DrawerField label="Layer B confidence" value={formatPct(chain.confidence, 1)} />
          <DrawerField label="Kill-chain progression" value={formatPct(chain.killChainProgress, 0)} />
        </div>
      </DrawerSection>
    </Drawer>
  );
}
