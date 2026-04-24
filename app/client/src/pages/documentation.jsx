import React from "react";
import {
  BookOpen,
  Layers,
  Rocket,
  Terminal,
  Wrench,
  UserCheck,
  AlertTriangle,
  GitBranch,
  Network,
  Database,
} from "lucide-react";

import PageShell from "../components/ui/PageShell";
import { IconNavBook } from "../data/icons";

/**
 * Documentation page.
 *
 * Self-contained, scroll-spy style sub-nav on the left, content on the right.
 * Content is intentionally rendered inline (instead of fetched from markdown)
 * so the page works offline and never depends on the build pipeline.
 */

const SECTIONS = [
  { id: "overview",      title: "Overview",                 icon: BookOpen  },
  { id: "getting-started", title: "Getting started",        icon: Rocket    },
  { id: "architecture",  title: "Architecture",             icon: Layers    },
  { id: "data-flow",     title: "Data flow",                icon: Network   },
  { id: "integration",   title: "Backend integration",      icon: Terminal  },
  { id: "configuration", title: "Configuration",            icon: Wrench    },
  { id: "workflow",      title: "Analyst workflow",         icon: UserCheck },
  { id: "troubleshooting", title: "Troubleshooting",        icon: AlertTriangle },
  { id: "release-notes", title: "Release notes",            icon: GitBranch },
  { id: "glossary",      title: "Glossary",                 icon: Database  },
];

function Section({ id, title, icon: Icon, children }) {
  return (
    <section id={id} className="scroll-mt-28">
      <header className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/60">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      </header>
      <div className="space-y-5 text-[0.95rem] leading-8 text-slate-700">{children}</div>
    </section>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-100/60">
      {title ? <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3> : null}
      {children}
    </div>
  );
}

function Kbd({ children }) {
  return (
    <code className="rounded-md bg-slate-900/90 px-1.5 py-0.5 font-mono text-[0.8rem] text-slate-100">
      {children}
    </code>
  );
}

export default function Documentation() {
  const [active, setActive] = React.useState(SECTIONS[0].id);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    const ids = SECTIONS.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!elements.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      {
        root: null,
        rootMargin: "-120px 0px -55% 0px",
        threshold: [0, 1],
      }
    );
    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jump = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  };

  return (
    <PageShell
      title="Documentation"
      subtitle="Operator guide for the AegisRec console and the learning-enhanced ICS detection engine"
      icon={IconNavBook}
    >
      <div ref={scrollRef} className="grid grid-cols-1 gap-8 lg:grid-cols-[16rem,minmax(0,1fr)]">
        {/* Left: sticky TOC */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/60">
            <p className="mb-3 px-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
              On this page
            </p>
            <ul className="space-y-1">
              {SECTIONS.map((s) => {
                const isActive = active === s.id;
                const Icon = s.icon;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => jump(s.id)}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                        isActive
                          ? "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      ].join(" ")}
                    >
                      <Icon
                        className={`h-4 w-4 ${isActive ? "text-indigo-500" : "text-slate-400"}`}
                      />
                      <span className="truncate">{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-indigo-600 p-5 text-white shadow-sm">
            <p className="text-sm font-semibold">Keep the engine in the loop</p>
            <p className="mt-2 text-xs leading-relaxed text-indigo-100/90">
              Every verdict you record in AegisRec is written to the Analyst-Validated Alert
              Repository (AVAR) and used to continuously retrain Layers A &amp; C.
            </p>
          </div>
        </aside>

        {/* Right: content */}
        <div className="space-y-14">
          <Section id="overview" title="Overview" icon={BookOpen}>
            <p>
              AegisRec is the analyst-facing console for the{" "}
              <strong>MITRE ATT&amp;CK for ICS Detection &amp; Correlation Engine</strong>. It
              surfaces live outputs of the detection pipeline — attack chains, alerts,
              collected logs and KG-grounded mitigation plans — and gives analysts the
              controls they need to triage, validate and steer the learning layers.
            </p>
            <p>
              The engine is organised as four cooperating layers. AegisRec simply renders
              what they produce and pipes analyst feedback back in.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card title="What you get">
                <ul className="list-inside list-disc space-y-2 text-sm">
                  <li>Live dashboard with engine KPIs and health</li>
                  <li>Kill-chain timelines with per-step evidence</li>
                  <li>Orchestrated alerts with full layer-by-layer reasoning</li>
                  <li>Human-readable mitigations with where-to-apply context</li>
                  <li>Real-time log stream with pivots back to alerts</li>
                </ul>
              </Card>
              <Card title="Design principles">
                <ul className="list-inside list-disc space-y-2 text-sm">
                  <li>Deterministic safety rails always visible</li>
                  <li>No black boxes — every score is explainable</li>
                  <li>Analyst verdict is a first-class signal (AVAR)</li>
                  <li>Consistent palette, density and keyboard affordances</li>
                </ul>
              </Card>
            </div>
          </Section>

          <Section id="getting-started" title="Getting started" icon={Rocket}>
            <p>
              AegisRec ships as a React application that talks to a FastAPI service hosted
              inside the detection-engine repository. A local run looks like this:
            </p>
            <Card>
              <pre className="overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 font-mono text-[0.8rem] leading-relaxed text-slate-100">
{`# 1. Start the learning service (default: http://localhost:8000)
cd MITRE-ATTACK-for-ICS-Detection-and-Correlation-Engine
python -m learning.cli serve

# 2. Start the AegisRec client
cd AegisRec/app/client
npm start

# 3. Open http://localhost:3000 and confirm the
#    connection pill in the top-right reads "Engine live".`}
              </pre>
            </Card>
            <p>
              No engine running? Toggle <strong>Demo mode</strong> in{" "}
              <Kbd>Settings → Detection engine</Kbd> to explore the UI with bundled sample
              data. The connection pill will switch to <span className="font-medium text-indigo-700">Demo mode</span>.
            </p>
          </Section>

          <Section id="architecture" title="Architecture" icon={Layers}>
            <p>
              The detection engine is composed of four layers. Each one is independently
              trainable, independently observable, and can be disabled for debugging.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card title="Layer A — Alert classifier">
                <p className="text-sm">
                  PU-learning binary classifier (XGBoost / HistGradientBoosting) with
                  isotonic calibration and Page-Hinkley / ADWIN drift detection. Outputs{" "}
                  <code>p(True Positive)</code>. A deterministic recall-floor safety rail
                  keeps known-bad events from being suppressed.
                </p>
              </Card>
              <Card title="Layer B — Chain attributor">
                <p className="text-sm">
                  Causal-window Transformer over (DC, asset, technique, tactic) tokens.
                  Produces chain/technique/tactic logits. Uses hierarchical masking so
                  implausible technique / tactic pairings are never emitted.
                </p>
              </Card>
              <Card title="Layer C — Triage policy">
                <p className="text-sm">
                  Contextual bandit (LinUCB) or DQN that chooses between{" "}
                  <em>escalate / review / monitor / drop</em>. Takes into account Layer A,
                  Layer B, the AVAR cache and deterministic safety rails.
                </p>
              </Card>
              <Card title="Layer D — Mitigation recommender">
                <p className="text-sm">
                  Multi-agent LLM pipeline (Planner, Generator, Analyst, Reflector)
                  grounded in the Neo4j MITRE ATT&amp;CK for ICS knowledge graph. Abstains
                  when retrieval is empty; marks plans for human approval when applicable.
                </p>
              </Card>
            </div>
          </Section>

          <Section id="data-flow" title="Data flow" icon={Network}>
            <p>
              AegisRec follows a simple, uni-directional flow from raw logs to analyst
              action. Every transition is inspectable:
            </p>
            <Card>
              <ol className="list-inside list-decimal space-y-2 text-sm leading-7">
                <li>
                  <strong>Ingestion:</strong> Filebeat / Suricata / Winlogbeat → Logstash →
                  Elasticsearch.
                </li>
                <li>
                  <strong>Detection:</strong> The Python engine normalises events, matches
                  DataComponents and produces candidate alerts.
                </li>
                <li>
                  <strong>Orchestration:</strong> Layer A → Layer B → Layer C (and Layer D
                  when applicable) produce an <code>OrchestratedDecision</code> per alert.
                </li>
                <li>
                  <strong>Exposure:</strong> The FastAPI service returns those decisions
                  through <code>/snapshot</code> for the UI to render.
                </li>
                <li>
                  <strong>Feedback:</strong> Analyst verdicts posted to{" "}
                  <code>/alerts/feedback</code> enter AVAR and feed the next training
                  cycle.
                </li>
              </ol>
            </Card>
          </Section>

          <Section id="integration" title="Backend integration" icon={Terminal}>
            <p>
              AegisRec expects the following endpoints on the engine's FastAPI service.
              All requests are JSON; responses are JSON unless stated.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card title="GET /health">
                <p className="text-sm">
                  Liveness probe and per-layer status. Consumed by the{" "}
                  <em>Engine health</em> widget on the dashboard and by the connection
                  pill in every page header.
                </p>
              </Card>
              <Card title="GET /snapshot">
                <p className="text-sm">
                  Returns <code>{"{ chains, alerts, logs, mitigations, stats, fetched_at }"}</code>.
                  Polled every <strong>N</strong> seconds (configurable in Settings).
                </p>
              </Card>
              <Card title="POST /alerts/feedback">
                <p className="text-sm">
                  Sends an analyst verdict (<em>confirmed / benign / ambiguous</em>) to
                  AVAR. Updates Layer C online.
                </p>
              </Card>
              <Card title="POST /poll/tick">
                <p className="text-sm">
                  Forces the orchestrator to query Elasticsearch immediately rather than
                  waiting for its background timer.
                </p>
              </Card>
            </div>
            <p>
              When the backend is unreachable, AegisRec keeps polling in the background
              and shows the <em>Engine not connected</em> fallback on every page so
              analysts are never left with stale data disguised as live data.
            </p>
          </Section>

          <Section id="configuration" title="Configuration" icon={Wrench}>
            <p>
              Client-side configuration lives in <code>Settings</code> and persists to
              browser local storage. Sensitive values should also be set on the engine
              side in <Kbd>config/learning.yml</Kbd>.
            </p>
            <Card>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Detection engine (client)
                  </p>
                  <ul className="list-inside list-disc space-y-1.5 text-sm">
                    <li><code>baseUrl</code> — URL of the FastAPI service</li>
                    <li><code>pollIntervalSec</code> — how often to refresh</li>
                    <li><code>requestTimeoutMs</code> — per-request abort timeout</li>
                    <li><code>demoMode</code> — use bundled fixtures</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Engine thresholds (server)
                  </p>
                  <ul className="list-inside list-disc space-y-1.5 text-sm">
                    <li><code>layer_a.alert_threshold</code></li>
                    <li><code>layer_a.recall_floor_score</code></li>
                    <li><code>layer_c.accept_safety_threshold</code></li>
                    <li><code>layer_c.ambiguity_band</code></li>
                    <li><code>layer_d.abstain_on_empty_retrieval</code></li>
                  </ul>
                </div>
              </div>
            </Card>
          </Section>

          <Section id="workflow" title="Analyst workflow" icon={UserCheck}>
            <p>A typical triage session in AegisRec looks like:</p>
            <Card>
              <ol className="list-inside list-decimal space-y-2.5 text-sm leading-7">
                <li>Open the <strong>Dashboard</strong> and scan top KPIs, active chains and recent critical alerts.</li>
                <li>Click through to <strong>Attack chains</strong> to understand progression of any active kill chain.</li>
                <li>Open an alert to review Layer A/B/C/D reasoning and raw evidence.</li>
                <li>Confirm or reject the alert — the verdict is persisted in AVAR.</li>
                <li>Open the <strong>Mitigations</strong> page to approve or assign the recommended plan.</li>
                <li>Follow up in <strong>Log monitoring</strong> to watch for recurrence.</li>
              </ol>
            </Card>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting" icon={AlertTriangle}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card title="Engine offline">
                <p className="text-sm">
                  Check that <code>python -m learning.cli serve</code> is running,
                  that <code>baseUrl</code> in Settings matches the service host, and
                  that no browser extension is blocking the request (CORS or mixed
                  content).
                </p>
              </Card>
              <Card title="Engine degraded">
                <p className="text-sm">
                  <code>/health</code> returns 200 but <code>/snapshot</code> fails.
                  Usually means the orchestrator hasn't finished its first poll.
                  Trigger <code>/poll/tick</code> manually from the Settings page.
                </p>
              </Card>
              <Card title="No mitigations appear">
                <p className="text-sm">
                  Layer D abstains when Neo4j retrieval is empty. Verify the KG is
                  loaded (<code>neo4j_client.ping()</code>) or switch to the
                  vector-retriever fallback in <code>config/learning.yml</code>.
                </p>
              </Card>
              <Card title="Slow polling">
                <p className="text-sm">
                  Increase <code>requestTimeoutMs</code> or reduce
                  <code>pollIntervalSec</code>. Heavy snapshots can take &gt;3 s on
                  warm-up.
                </p>
              </Card>
            </div>
          </Section>

          <Section id="release-notes" title="Release notes" icon={GitBranch}>
            <Card>
              <ul className="divide-y divide-slate-100 text-sm">
                <li className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">v0.3 — Learning integration</p>
                    <p className="text-xs text-slate-500">
                      Full A→B→C→D wiring, connection pill, sticky sidebar, documentation
                      and settings pages, offline fallback.
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200/70">
                    current
                  </span>
                </li>
                <li className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">v0.2 — Detection UI</p>
                    <p className="text-xs text-slate-500">
                      Attack chains, alerts, mitigations and log monitoring with rich
                      drawers and cross-linking.
                    </p>
                  </div>
                </li>
                <li className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">v0.1 — Inventory &amp; AI assistant</p>
                    <p className="text-xs text-slate-500">
                      Asset register, inventory diagram, and conversational AI shell.
                    </p>
                  </div>
                </li>
              </ul>
            </Card>
          </Section>

          <Section id="glossary" title="Glossary" icon={Database}>
            <Card>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                {[
                  ["AVAR", "Analyst-Validated Alert Repository. Persistent cache of verdicts used by Layer C and future training runs."],
                  ["DC", "Data Component. ATT&CK's unit of observability (e.g. DC0078 Network Traffic Flow)."],
                  ["Layer A", "Alert classifier — p(True Positive) with calibration and drift."],
                  ["Layer B", "Causal-window Transformer that attributes events to chains / techniques / tactics."],
                  ["Layer C", "Triage policy — escalate / review / monitor / drop, with safety rails."],
                  ["Layer D", "Mitigation recommender — KG-grounded multi-agent LLM."],
                  ["Safety rail", "Deterministic rule that can override or enforce a decision regardless of the learned model."],
                  ["Snapshot", "The JSON document returned by /snapshot, bundling everything the UI needs."],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-sm font-semibold text-slate-900">{k}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-600">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Section>
        </div>
      </div>
    </PageShell>
  );
}
