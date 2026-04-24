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

import { useEngine } from "../context/EngineContext";
import EngineOfflineState from "../components/ui/EngineOfflineState";
import { assetOf, tacticOf } from "../data/detectionSample";

function Card({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-100/60 sm:p-7 ${className}`}>
      {(title || action) && (
        <header className="mb-5 flex items-center justify-between gap-3">
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
      <div className="mb-1.5 flex items-center justify-between text-xs">
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
      <span className="w-10 text-right font-mono text-slate-500">{count}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, health, isConnected } = useEngine();

  if (!isConnected) {
    return (
      <PageShell
        title="SOC dashboard"
        subtitle="Security posture of your ICS/OT environment — live outputs from the detection & correlation engine"
        icon={IconNavDashboard}
      >
        <EngineOfflineState />
      </PageShell>
    );
  }

  const { chains = [], alerts = [], mitigations = [], stats } = data;

  // Robust fallbacks when some stats fields aren't populated.
  const activeChains = chains.filter((c) => c.status === "active").length;
  const containedChains = chains.filter((c) => c.status === "contained").length;
  const alertsLast24h = stats?.alertsLast24h ?? alerts.length;
  const criticalAlerts24h = stats?.criticalAlerts24h ?? alerts.filter((a) => a.severity === "critical").length;
  const mitigationsProposed = stats?.mitigationsProposed ?? mitigations.filter((m) => m.status === "proposed").length;
  const mitigationsImplemented = stats?.mitigationsImplemented ?? mitigations.filter((m) => m.status === "implemented").length;
  const classifierAUROC = stats?.classifierAUROC;
  const falsePositiveRate = stats?.falsePositiveRate;
  const avgLatencyMs = stats?.avgLatencyMs;
  const p95LatencyMs = stats?.p95LatencyMs;
  const avarEntries = stats?.avarEntries;
  const driftAlarms = stats?.driftAlarms ?? 0;
  const alertsPerHour = stats?.alertsPerHour || [];
  const tacticsDistribution = stats?.tacticsDistribution || [];
  const assetHeat = stats?.assetHeat || [];
  const triage = stats?.triageActions || {};
  const recentFeedback = stats?.recentFeedback || [];

  const topChains = [...chains]
    .sort((a, b) => (b.severity === "critical") - (a.severity === "critical") || (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 3);

  const criticalAlerts = [...alerts]
    .filter((a) => a.severity === "critical" || a.severity === "high")
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 6);

  const proposedMits = mitigations.filter((m) => m.status === "proposed");
  const maxTactic = Math.max(...tacticsDistribution.map((t) => t.count), 1);
  const maxAsset = Math.max(...assetHeat.map((a) => a.count), 1);
  const triageTotal = Object.values(triage).reduce((a, b) => a + b, 0) || 1;

  return (
    <PageShell
      title="SOC dashboard"
      subtitle="Security posture of your ICS/OT environment — live outputs from the detection & correlation engine"
      icon={IconNavDashboard}
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active attack chains"
          value={activeChains}
          hint={`${containedChains} contained`}
          icon={Target}
          tone="red"
        />
        <StatCard
          title="Alerts · last 24h"
          value={alertsLast24h}
          trend={{ direction: "up", label: `${criticalAlerts24h} critical` }}
          icon={Bell}
          tone="rose"
        />
        <StatCard
          title="Mitigations proposed"
          value={mitigationsProposed}
          hint={`${mitigationsImplemented} implemented`}
          icon={ShieldCheck}
          tone="indigo"
        />
        <StatCard
          title="Classifier AUROC"
          value={classifierAUROC != null ? Number(classifierAUROC).toFixed(3) : "—"}
          hint={falsePositiveRate != null ? `FPR ${formatPct(falsePositiveRate, 1)}` : "no metrics"}
          icon={Brain}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        <StatCard
          title="Avg latency"
          value={avgLatencyMs != null ? `${avgLatencyMs} ms` : "—"}
          hint={p95LatencyMs != null ? `p95 ${p95LatencyMs} ms` : ""}
          icon={Gauge}
          tone="sky"
        />
        <StatCard
          title="AVAR entries"
          value={avarEntries ?? "—"}
          hint="Analyst-validated verdicts"
          icon={Users}
          tone="indigo"
        />
        <StatCard
          title="Drift alarms"
          value={driftAlarms}
          hint="Page-Hinkley / ADWIN"
          icon={Activity}
          tone={driftAlarms > 0 ? "amber" : "emerald"}
        />
        <StatCard
          title="Kill-chain progress"
          value={formatPct(Math.max(0, ...chains.map((c) => c.killChainProgress || 0)))}
          hint={topChains[0]?.name?.split("·")[0]?.trim() || "—"}
          icon={TrendingUp}
          tone="rose"
        />
      </div>

      {/* Row: alert volume + tactics */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
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
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-3xl font-semibold text-slate-900">{alertsLast24h}</p>
              <p className="mt-1 text-xs text-slate-500">
                Peak hour · {alertsPerHour.length ? Math.max(...alertsPerHour) : 0} alerts
              </p>
            </div>
            {alertsPerHour.length > 0 ? (
              <Sparkline data={alertsPerHour} width={420} height={80} />
            ) : (
              <span className="text-xs text-slate-400">No hourly data yet</span>
            )}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {["escalate", "review", "monitor", "drop"].map((k) => {
              const v = triage[k] || 0;
              return (
                <div key={k} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 text-xs">
                  <div className="mb-1.5 flex items-center justify-between">
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
              );
            })}
          </div>
        </Card>

        <Card title="Tactic distribution (MITRE ATT&CK for ICS)">
          {tacticsDistribution.length === 0 ? (
            <p className="text-sm text-slate-500">No tactic data in current snapshot.</p>
          ) : (
            <div className="space-y-3">
              {tacticsDistribution.map((t) => (
                <TacticBar key={t.tactic} item={t} max={maxTactic} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row: top chains + asset heatmap */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
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
          {topChains.length === 0 ? (
            <p className="text-sm text-slate-500">No attack chains recognised yet.</p>
          ) : (
            <div className="space-y-4">
              {topChains.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate("/TTPs", { state: { chainId: c.id } })}
                  className="group w-full rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/60 px-5 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{c.name}</span>
                    <StatusBadge status={c.status} />
                    <SeverityBadge severity={c.severity} />
                    <span className="ml-auto text-xs text-slate-500">{formatRelative(c.lastSeenAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{c.summary}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {(c.tactics || []).slice(0, 4).map((t) => (
                      <TacticChip key={t} id={t} />
                    ))}
                  </div>
                  <div className="mt-3 max-w-sm">
                    <ConfidenceBar value={c.confidence || 0} label="Layer B confidence" size="sm" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title="Asset risk heat-map">
          {assetHeat.length === 0 ? (
            <p className="text-sm text-slate-500">No asset data in current snapshot.</p>
          ) : (
            <div className="space-y-2.5">
              {assetHeat.map((a) => (
                <AssetHeatRow key={a.assetId} {...a} max={maxAsset} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row: critical alerts + proposed mitigations */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
          {criticalAlerts.length === 0 ? (
            <p className="text-sm text-slate-500">No critical alerts right now.</p>
          ) : (
            <ul className="space-y-2.5">
              {criticalAlerts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-3 transition hover:bg-indigo-50/50"
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
          )}
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
          {proposedMits.length === 0 ? (
            <p className="text-sm text-slate-500">No proposals pending — all caught up.</p>
          ) : (
            <ul className="space-y-2.5">
              {proposedMits.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-3"
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
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{m.rationale}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Row: engine ops */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Triage action mix">
          {Object.keys(triage).length === 0 ? (
            <p className="text-sm text-slate-500">No actions recorded yet.</p>
          ) : (
            <>
              <BarChartMini
                data={Object.entries(triage).map(([k, v]) => ({ label: k, count: v }))}
                width={240}
                height={110}
              />
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                {Object.entries(triage).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <TriageBadge action={k} size="xs" />
                    <span className="font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card title="Recent analyst feedback">
          {recentFeedback.length === 0 ? (
            <p className="text-sm text-slate-500">No feedback recorded yet.</p>
          ) : (
            <ul className="space-y-3.5 text-xs">
              {recentFeedback.map((f) => (
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
          )}
        </Card>

        <Card title="Engine health">
          {health?.layers ? (
            <div className="space-y-3 text-xs text-slate-700">
              {Object.entries(health.layers).map(([layer, state]) => (
                <div key={layer} className="flex items-center justify-between">
                  <span>Layer {String(layer).toUpperCase()}</span>
                  <HealthDot state={state} />
                </div>
              ))}
              {health.neo4j ? (
                <div className="flex items-center justify-between">
                  <span>Neo4j knowledge graph</span>
                  <HealthDot state={health.neo4j} />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Engine did not report detailed health.</p>
          )}
          <p className="mt-4 text-[0.7rem] text-slate-400">
            Telemetry polled from <span className="font-mono">/health</span>.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}

function HealthDot({ state }) {
  const s = String(state || "").toLowerCase();
  const tone =
    s === "healthy" || s === "connected" || s === "green" || s === "ok"
      ? "emerald"
      : s === "degraded" || s === "yellow" || s === "warming"
      ? "amber"
      : "rose";
  const tones = {
    emerald: "text-emerald-600 bg-emerald-500",
    amber:   "text-amber-600 bg-amber-500",
    rose:    "text-rose-600 bg-rose-500",
  };
  const [textTone, dotTone] = tones[tone].split(" ");
  return (
    <span className={`inline-flex items-center gap-1 ${textTone}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${dotTone}`} /> {String(state)}
    </span>
  );
}
