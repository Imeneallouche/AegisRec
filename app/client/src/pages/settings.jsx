import React from "react";
import {
  PlugZap,
  Brain,
  Workflow,
  Sparkles,
  BellRing,
  UserCircle2,
  Palette,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import PageShell from "../components/ui/PageShell";
import {
  Field,
  TextInput,
  NumberInput,
  SelectInput,
  SliderInput,
  Toggle,
  SettingsGroup,
} from "../components/ui/Field";
import { IconNavSettings } from "../data/icons";

import { useSettings, DEFAULT_SETTINGS } from "../context/SettingsContext";
import { useEngine } from "../context/EngineContext";
import { detectionApi } from "../api/detectionApi";

const LLM_BACKENDS = [
  { value: "mock",    label: "Mock (no network)" },
  { value: "ollama",  label: "Ollama (self-hosted)" },
  { value: "openai",  label: "OpenAI" },
];

const TIMEZONES = [
  { value: "local", label: "Browser local time" },
  { value: "UTC",   label: "UTC" },
];

const ROLES = [
  { value: "tier-1",     label: "Tier 1 analyst" },
  { value: "tier-2",     label: "Tier 2 analyst" },
  { value: "tier-3",     label: "Tier 3 / Incident responder" },
  { value: "admin",      label: "Administrator" },
];

const DENSITIES = [
  { value: "comfortable", label: "Comfortable (default)" },
  { value: "compact",     label: "Compact" },
];

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { status, health, refresh, lastUpdated } = useEngine();

  const [testState, setTestState] = React.useState({ status: "idle", message: null });
  const [tickState, setTickState] = React.useState({ status: "idle", message: null });
  const [savedFlash, setSavedFlash] = React.useState(false);

  const { engine, layerA, layerC, layerD, notifications, analyst, appearance } = settings;

  React.useEffect(() => {
    if (!savedFlash) return undefined;
    const id = setTimeout(() => setSavedFlash(false), 1800);
    return () => clearTimeout(id);
  }, [savedFlash]);

  const flash = () => setSavedFlash(true);
  const mut = (section, patch) => {
    updateSettings({ [section]: patch });
    flash();
  };

  const testConnection = async () => {
    setTestState({ status: "running", message: null });
    try {
      const h = await detectionApi.health(engine.baseUrl, engine.requestTimeoutMs);
      setTestState({
        status: "ok",
        message: `OK · ${h?.version ? `version ${h.version}` : "engine responded"}`,
      });
      refresh();
    } catch (err) {
      setTestState({ status: "error", message: err.message || String(err) });
    }
  };

  const pollTick = async () => {
    setTickState({ status: "running", message: null });
    try {
      await detectionApi.pollTick(engine.baseUrl, engine.requestTimeoutMs);
      setTickState({ status: "ok", message: "Engine asked to poll Elasticsearch now" });
      refresh();
    } catch (err) {
      setTickState({ status: "error", message: err.message || String(err) });
    }
  };

  return (
    <PageShell
      title="Settings"
      subtitle="Configure the AegisRec client and tune the detection engine thresholds"
      icon={IconNavSettings}
      actions={
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Reset all settings to defaults? This affects only this browser.")) {
              resetSettings();
              flash();
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to defaults
        </button>
      }
    >
      {savedFlash ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 shadow-sm">
          <CheckCircle2 className="h-4 w-4" />
          Settings saved locally.
        </div>
      ) : null}

      <SettingsGroup
        icon={PlugZap}
        title="Detection engine"
        description="How AegisRec talks to the learning service. The connection pill in every page header reflects these settings."
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Field
            label="Base URL"
            description="FastAPI service (learning/api.py). Include scheme and port."
            htmlFor="engine-url"
          >
            <TextInput
              id="engine-url"
              value={engine.baseUrl}
              onChange={(v) => mut("engine", { baseUrl: v })}
              placeholder="http://127.0.0.1:8090"
            />
          </Field>
          <Field
            label="Poll interval"
            description="How often AegisRec requests a fresh /snapshot. Minimum 3 seconds."
            htmlFor="engine-poll"
          >
            <NumberInput
              id="engine-poll"
              value={engine.pollIntervalSec}
              onChange={(v) => mut("engine", { pollIntervalSec: Math.max(3, Number(v) || 3) })}
              min={3}
              max={600}
              suffix="seconds"
            />
          </Field>
          <Field
            label="Request timeout"
            description="Per-request abort timeout. Raise for slow snapshots on warm-up."
            htmlFor="engine-timeout"
          >
            <NumberInput
              id="engine-timeout"
              value={engine.requestTimeoutMs}
              onChange={(v) => mut("engine", { requestTimeoutMs: Math.max(500, Number(v) || 500) })}
              min={500}
              max={60000}
              step={500}
              suffix="ms"
            />
          </Field>
          <Field label="Mode" description="Switch to demo mode to explore the UI without a running engine.">
            <Toggle
              checked={engine.demoMode}
              onChange={(v) => mut("engine", { demoMode: v })}
              label={engine.demoMode ? "Demo mode (bundled fixtures)" : "Live mode (poll the engine)"}
              description="Demo mode serves bundled sample data so the dashboard, chains, alerts and mitigations pages still render."
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4">
          <button
            type="button"
            onClick={testConnection}
            disabled={testState.status === "running"}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlugZap className="h-4 w-4" />
            {testState.status === "running" ? "Testing…" : "Test connection"}
          </button>
          <button
            type="button"
            onClick={pollTick}
            disabled={tickState.status === "running"}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            Force orchestrator tick
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
            <StatusLine label="Status" value={status.toUpperCase()} tone={toneFor(status)} />
            {lastUpdated ? (
              <StatusLine label="Last update" value={new Date(lastUpdated).toLocaleTimeString()} />
            ) : null}
            {health?.version ? <StatusLine label="Version" value={health.version} mono /> : null}
          </div>
        </div>

        {(testState.message || tickState.message) && (
          <div className="space-y-2">
            {testState.message ? (
              <InlineResult state={testState} />
            ) : null}
            {tickState.message ? (
              <InlineResult state={tickState} />
            ) : null}
          </div>
        )}
      </SettingsGroup>

      <SettingsGroup
        icon={Brain}
        title="Layer A · Alert classifier"
        description="Client hints that mirror the engine's layer_a configuration. The server remains the source of truth; use config/learning.yml for permanent changes."
      >
        <Field
          label="Alert threshold"
          description="Minimum p(True Positive) required for a candidate event to surface as an alert."
          htmlFor="layer-a-threshold"
        >
          <SliderInput
            id="layer-a-threshold"
            value={layerA.alertThreshold}
            onChange={(v) => mut("layerA", { alertThreshold: v })}
            min={0}
            max={1}
            step={0.01}
          />
        </Field>
        <Toggle
          checked={layerA.recallFloorEnabled}
          onChange={(v) => mut("layerA", { recallFloorEnabled: v })}
          label="Recall-floor safety rail"
          description="Deterministic escape hatch that keeps known-bad events from being suppressed by the learned classifier."
        />
      </SettingsGroup>

      <SettingsGroup
        icon={Workflow}
        title="Layer C · Triage policy"
        description="Decision boundaries used when the policy asks for analyst review."
      >
        <Field
          label="Auto-escalate (accept-safety threshold)"
          description="Above this confidence, Layer C's recommendation is auto-accepted without ambiguity-band review."
          htmlFor="layer-c-accept"
        >
          <SliderInput
            id="layer-c-accept"
            value={layerC.acceptSafetyThreshold}
            onChange={(v) => mut("layerC", { acceptSafetyThreshold: v })}
            min={0.5}
            max={1}
            step={0.01}
          />
        </Field>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Field
            label="Ambiguity band · low"
            description="Below this Layer-A probability, alerts are automatically dropped (unless a safety rail fires)."
            htmlFor="layer-c-low"
          >
            <SliderInput
              id="layer-c-low"
              value={layerC.ambiguityBandLow}
              onChange={(v) => mut("layerC", { ambiguityBandLow: v })}
              min={0}
              max={0.6}
              step={0.01}
            />
          </Field>
          <Field
            label="Ambiguity band · high"
            description="Above this, alerts are eligible for auto-escalation; below this, the policy asks for review."
            htmlFor="layer-c-high"
          >
            <SliderInput
              id="layer-c-high"
              value={layerC.ambiguityBandHigh}
              onChange={(v) => mut("layerC", { ambiguityBandHigh: v })}
              min={0.4}
              max={1}
              step={0.01}
            />
          </Field>
        </div>
      </SettingsGroup>

      <SettingsGroup
        icon={Sparkles}
        title="Layer D · Mitigation recommender"
        description="Controls how the multi-agent LLM pipeline surfaces and gates mitigation plans."
      >
        <Field
          label="LLM backend"
          description="Switch to Ollama for fully offline operation, or OpenAI for higher-quality generations."
          htmlFor="layer-d-backend"
        >
          <SelectInput
            id="layer-d-backend"
            value={layerD.llmBackend}
            onChange={(v) => mut("layerD", { llmBackend: v })}
            options={LLM_BACKENDS}
          />
        </Field>
        <Toggle
          checked={layerD.abstainOnEmptyRetrieval}
          onChange={(v) => mut("layerD", { abstainOnEmptyRetrieval: v })}
          label="Abstain on empty KG retrieval"
          description="If the knowledge graph returns nothing for the alert's techniques, Layer D abstains rather than hallucinating."
        />
        <Toggle
          checked={layerD.requireHumanApproval}
          onChange={(v) => mut("layerD", { requireHumanApproval: v })}
          label="Require human approval for high-impact plans"
          description="Plans that touch safety-relevant assets or require network changes will always be marked for analyst sign-off."
        />
      </SettingsGroup>

      <SettingsGroup
        icon={BellRing}
        title="Notifications"
        description="Browser notifications and digest emails for the most important detection events."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Toggle
            checked={notifications.criticalAlerts}
            onChange={(v) => mut("notifications", { criticalAlerts: v })}
            label="Critical alerts"
            description="Push a browser notification whenever a critical-severity alert is emitted."
          />
          <Toggle
            checked={notifications.newChains}
            onChange={(v) => mut("notifications", { newChains: v })}
            label="New attack chains"
            description="Notify when Layer B recognises a new chain on any monitored asset."
          />
          <Toggle
            checked={notifications.mitigationsProposed}
            onChange={(v) => mut("notifications", { mitigationsProposed: v })}
            label="Mitigations awaiting approval"
            description="Ping you when Layer D proposes a plan that requires human approval."
          />
          <Toggle
            checked={notifications.emailDigest}
            onChange={(v) => mut("notifications", { emailDigest: v })}
            label="Daily email digest"
            description="Requires an SMTP configuration on the engine side."
          />
        </div>
      </SettingsGroup>

      <SettingsGroup
        icon={UserCircle2}
        title="Analyst profile"
        description="Personalisation used in verdicts, comments and exported reports."
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Field label="Display name" htmlFor="analyst-name">
            <TextInput
              id="analyst-name"
              value={analyst.displayName}
              onChange={(v) => mut("analyst", { displayName: v })}
              placeholder="e.g. A. Benali"
            />
          </Field>
          <Field label="Role" htmlFor="analyst-role">
            <SelectInput
              id="analyst-role"
              value={analyst.role}
              onChange={(v) => mut("analyst", { role: v })}
              options={ROLES}
            />
          </Field>
          <Field label="Timezone" htmlFor="analyst-tz">
            <SelectInput
              id="analyst-tz"
              value={analyst.timezone}
              onChange={(v) => mut("analyst", { timezone: v })}
              options={TIMEZONES}
            />
          </Field>
        </div>
      </SettingsGroup>

      <SettingsGroup
        icon={Palette}
        title="Appearance"
        description="Visual density and layout preferences."
      >
        <Field label="Density" htmlFor="appearance-density">
          <SelectInput
            id="appearance-density"
            value={appearance.density}
            onChange={(v) => mut("appearance", { density: v })}
            options={DENSITIES}
          />
        </Field>
        <p className="text-xs text-slate-500">
          Defaults:{" "}
          <span className="font-mono">
            poll {DEFAULT_SETTINGS.engine.pollIntervalSec}s · timeout{" "}
            {DEFAULT_SETTINGS.engine.requestTimeoutMs}ms · Layer A threshold{" "}
            {DEFAULT_SETTINGS.layerA.alertThreshold}
          </span>
        </p>
      </SettingsGroup>
    </PageShell>
  );
}

function toneFor(status) {
  switch (status) {
    case "connected": return "emerald";
    case "demo":      return "indigo";
    case "offline":   return "rose";
    case "degraded":  return "amber";
    default:          return "slate";
  }
}

function StatusLine({ label, value, tone = "slate", mono = false }) {
  const tones = {
    emerald: "text-emerald-700",
    indigo:  "text-indigo-700",
    rose:    "text-rose-700",
    amber:   "text-amber-700",
    slate:   "text-slate-600",
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${mono ? "font-mono" : ""} ${tones[tone] || tones.slate}`}>
        {value}
      </span>
    </span>
  );
}

function InlineResult({ state }) {
  const isOk = state.status === "ok";
  const isErr = state.status === "error";
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
        isOk
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : isErr
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {isOk ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : isErr ? (
        <AlertTriangle className="h-4 w-4" />
      ) : null}
      <span className="truncate font-mono [overflow-wrap:anywhere]">{state.message}</span>
    </div>
  );
}
