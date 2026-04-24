import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  Bell,
  ShieldCheck,
  Activity,
  Gauge,
  Brain,
  Users,
  TrendingUp,
} from "lucide-react";

import PageShell from "../components/ui/PageShell";
import StatCard from "../components/ui/StatCard";
import Sparkline, { BarChartMini } from "../components/ui/Sparkline";
import { SeverityBadge, StatusBadge, TriageBadge } from "../components/ui/Badge";
import TacticChip from "../components/detection/TacticChip";
import ConfidenceBar from "../components/ui/ConfidenceBar";
import { formatRelative, formatPct } from "../components/ui/formatters";
import { IconNavDashboard } from "../data/icons";

import {
  DASHBOARD_STATS,
  CHAINS,
  ALERTS,
  MITIGATIONS,
  assetOf,
  tacticOf,
} from "../data/detectionSample";

function Card({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/60 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title ? <h3 className="text-sm font-semibold text-slate-900">{title}</h3> : <span />}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

function TacticBar({ item, max }) {
  const pct = Math.max(4, Math.round((item.count / max) * 100));
  const tone = tacticOf(item.tactic).tone;
  const bg = {
    rose:    "bg-rose-500",
    amber:   "bg-amber-500",
    violet:  "bg-violet-500",
    pink:    "bg-pink-500",
    slate:   "bg-slate-500",
    cyan:    "bg-cyan-500",
    indigo:  "bg-indigo-500",
    sky:     "bg-sky-500",
    orange:  "bg-orange-500",
    red:     "bg-red-500",
  }[tone] || "bg-indigo-500";
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="truncate font-medium text-slate-700">{item.label}</span>
        <span className="font-mono text-slate-500">{item.count}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`${bg} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AssetHeatRow({ assetId, count, max }) {
  const asset = assetOf(assetId);
  const pct = Math.max(4, Math.round((count / max) * 100));
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-40 truncate font-medium text-slate-700">{asset.name}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-slate-500">{count}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const topChains = [...CHAINS]
    .sort((a, b) => (b.severity === "critical") - (a.severity === "critical") || b.confidence - a.confidence)
    .slice(0, 3);

  const criticalAlerts = [...ALERTS]
    .filter((a) => a.severity === "critical" || a.severity === "high")
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6);

  const proposedMits = MITIGATIONS.filter((m) => m.status === "proposed");
  const maxTactic = Math.max(...DASHBOARD_STATS.tacticsDistribution.map((t) => t.count), 1);
  const maxAsset = Math.max(...DASHBOARD_STATS.assetHeat.map((a) => a.count), 1);
  const triage = DASHBOARD_STATS.triageActions;
  const triageTotal = Object.values(triage).reduce((a, b) => a + b, 0) || 1;

  return (
    <PageShell
      title="SOC dashboard"
      subtitle="Security posture of your ICS/OT environment — live outputs from the detection & correlation engine"
      icon={IconNavDashboard}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active attack chains"
          value={DASHBOARD_STATS.activeChains}
          hint={`${DASHBOARD_STATS.containedChains} contained`}
          icon={Target}
          tone="red"
        />
        <StatCard
          title="Alerts · last 24h"
          value={DASHBOARD_STATS.alertsLast24h}
          trend={{ direction: "up", label: `${DASHBOARD_STATS.criticalAlerts24h} critical` }}
          icon={Bell}
          tone="rose"
        />
        <StatCard
          title="Mitigations proposed"
          value={DASHBOARD_STATS.mitigationsProposed}
          hint={`${DASHBOARD_STATS.mitigationsImplemented} implemented`}
          icon={ShieldCheck}
          tone="indigo"
        />
        <StatCard
          title="Classifier AUROC"
          value={DASHBOARD_STATS.classifierAUROC.toFixed(3)}
          hint={`FPR ${formatPct(DASHBOARD_STATS.falsePositiveRate, 1)}`}
          icon={Brain}
          tone="emerald"
        />
      </div>

      {/* Second KPI row */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="Avg latency"
          value={`${DASHBOARD_STATS.avgLatencyMs} ms`}
          hint={`p95 ${DASHBOARD_STATS.p95LatencyMs} ms`}
          icon={Gauge}
          tone="sky"
        />
        <StatCard
          title="AVAR entries"
          value={DASHBOARD_STATS.avarEntries}
          hint="Analyst-validated verdicts"
          icon={Users}
          tone="indigo"
        />
        <StatCard
          title="Drift alarms"
          value={DASHBOARD_STATS.driftAlarms}
          hint="Page-Hinkley / ADWIN"
          icon={Activity}
          tone={DASHBOARD_STATS.driftAlarms > 0 ? "amber" : "emerald"}
        />
        <StatCard
          title="Kill-chain progress"
          value={formatPct(Math.max(...CHAINS.map((c) => c.killChainProgress || 0)))}
          hint={topChains[0]?.name.split("·")[0].trim()}
          icon={TrendingUp}
          tone="rose"
        />
      </div>

      {/* Row: alert volume + tactics */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          title="Alert volume · last 24 hours"
          action={
            <button
              type="button"
              onClick={() => navigate("/Alerts")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all →
            </button>
          }
          className="xl:col-span-2"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold text-slate-900">{DASHBOARD_STATS.alertsLast24h}</p>
              <p className="text-xs text-slate-500">Peak hour · {Math.max(...DASHBOARD_STATS.alertsPerHour)} alerts</p>
            </div>
            <Sparkline data={DASHBOARD_STATS.alertsPerHour} width={420} height={80} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(triage).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-xs">
                <div className="mb-1 flex items-center justify-between">
                  <TriageBadge action={k} />
                  <span className="font-mono text-slate-600">{v}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500"
                    style={{ width: `${Math.round((v / triageTotal) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Tactic distribution (MITRE ATT&CK for ICS)">
          <div className="space-y-2.5">
            {DASHBOARD_STATS.tacticsDistribution.map((t) => (
              <TacticBar key={t.tactic} item={t} max={maxTactic} />
            ))}
          </div>
        </Card>
      </div>

      {/* Row: top chains + asset heatmap */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card
          title="Top active attack chains"
          action={
            <button
              type="button"
              onClick={() => navigate("/TTPs")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all →
            </button>
          }
          className="xl:col-span-2"
        >
          <div className="space-y-3">
            {topChains.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate("/TTPs", { state: { chainId: c.id } })}
                className="group w-full rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/60 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{c.name}</span>
                  <StatusBadge status={c.status} />
                  <SeverityBadge severity={c.severity} />
                  <span className="ml-auto text-xs text-slate-500">{formatRelative(c.lastSeenAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(c.tactics || []).slice(0, 4).map((t) => (
                    <TacticChip key={t} id={t} />
                  ))}
                </div>
                <div className="mt-2 max-w-sm">
                  <ConfidenceBar value={c.confidence} label="Layer B confidence" size="sm" />
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Asset risk heat-map">
          <div className="space-y-2">
            {DASHBOARD_STATS.assetHeat.map((a) => (
              <AssetHeatRow key={a.assetId} {...a} max={maxAsset} />
            ))}
          </div>
        </Card>
      </div>

      {/* Row: critical alerts + proposed mitigations */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card
          title="Recent critical / high alerts"
          action={
            <button
              type="button"
              onClick={() => navigate("/Alerts")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all →
            </button>
          }
        >
          <ul className="space-y-2">
            {criticalAlerts.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 transition hover:bg-indigo-50/50"
              >
                <SeverityBadge severity={a.severity} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{a.message}</p>
                  <p className="truncate text-xs text-slate-500">
                    {assetOf(a.assetId).name} · {formatRelative(a.timestamp)}
                  </p>
                </div>
                <TriageBadge action={a.layerC?.action} />
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Proposed mitigations awaiting action"
          action={
            <button
              type="button"
              onClick={() => navigate("/Mitigations")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all →
            </button>
          }
        >
          <ul className="space-y-2">
            {proposedMits.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="truncate text-sm font-medium text-slate-800">{m.title}</span>
                  <SeverityBadge severity={m.priority} size="xs" />
                  {m.requiresHumanApproval ? (
                    <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200/70">
                      approval
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{m.rationale}</p>
              </li>
            ))}
            {proposedMits.length === 0 ? (
              <p className="text-sm text-slate-500">No proposals pending — all caught up.</p>
            ) : null}
          </ul>
        </Card>
      </div>

      {/* Row: engine ops */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Triage action mix">
          <BarChartMini
            data={Object.entries(triage).map(([k, v]) => ({ label: k, count: v }))}
            width={240}
            height={110}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
            {Object.entries(triage).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <TriageBadge action={k} size="xs" />
                <span className="font-mono">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent analyst feedback">
          <ul className="space-y-3 text-xs">
            {DASHBOARD_STATS.recentFeedback.map((f) => (
              <li key={f.alertId + f.at} className="flex items-center justify-between">
                <span className="min-w-0">
                  <span className="font-medium text-slate-800">{f.analyst}</span> marked{" "}
                  <span className="font-mono text-slate-700">{f.alertId}</span> as{" "}
                  <span
                    className={
                      f.verdict === "confirmed"
                        ? "font-semibold text-rose-600"
                        : f.verdict === "benign"
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-slate-600"
                    }
                  >
                    {f.verdict}
                  </span>
                </span>
                <span className="text-slate-400">{formatRelative(f.at)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Engine health">
          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span>Layer A · classifier</span>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Layer B · transformer</span>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Layer C · triage policy</span>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Layer D · mitigation agents</span>
              <span className="inline-flex items-center gap-1 text-amber-600">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> degraded
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Neo4j knowledge graph</span>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> connected
              </span>
            </div>
          </div>
          <p className="mt-4 text-[0.7rem] text-slate-400">
            Telemetry polled from <span className="font-mono">/health</span> on the learning service.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
