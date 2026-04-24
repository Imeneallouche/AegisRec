/**
 * Mock data for the ICS Detection & Correlation Engine.
 *
 * Shape mirrors the Python orchestrator (learning/orchestrator.py) so once the
 * FastAPI service at /alerts/score and /alerts/batch is wired, only the fetch
 * layer changes — not the UI.
 *
 * Entities:
 *   - chains        → Attack chains recognised by Layer B (causal-window Transformer).
 *   - alerts        → Per-event orchestrated decisions (Layer A → B → C → D).
 *   - logs          → Raw / normalised log entries feeding the detection engine.
 *   - mitigations   → Human-readable mitigation plans (Layer D, KG-grounded).
 *   - dashboardStats → Aggregated KPIs for the SOC analyst landing page.
 */

/* ──────────────────────────────────────────────────────────────────────── */
/* Vocabularies                                                             */
/* ──────────────────────────────────────────────────────────────────────── */

export const TACTICS = {
  TA0108: { id: "TA0108", name: "Initial Access", tone: "rose" },
  TA0102: { id: "TA0102", name: "Execution", tone: "amber" },
  TA0110: { id: "TA0110", name: "Persistence", tone: "violet" },
  TA0103: { id: "TA0103", name: "Privilege Escalation", tone: "pink" },
  TA0107: { id: "TA0107", name: "Evasion", tone: "slate" },
  TA0102b: { id: "TA0102b", name: "Discovery", tone: "cyan" },
  TA0109: { id: "TA0109", name: "Lateral Movement", tone: "indigo" },
  TA0100: { id: "TA0100", name: "Collection", tone: "sky" },
  TA0101: { id: "TA0101", name: "Command and Control", tone: "orange" },
  TA0106: { id: "TA0106", name: "Inhibit Response Function", tone: "rose" },
  TA0104: { id: "TA0104", name: "Impair Process Control", tone: "red" },
  TA0105: { id: "TA0105", name: "Impact", tone: "red" },
};

export const DATA_COMPONENTS = {
  DC0038: { id: "DC0038", name: "Application Log Content" },
  DC0067: { id: "DC0067", name: "Logon Session Creation" },
  DC0078: { id: "DC0078", name: "Network Traffic Flow" },
  DC0082: { id: "DC0082", name: "Network Connection Creation" },
  DC0090: { id: "DC0090", name: "Process Creation" },
  DC0109: { id: "DC0109", name: "Process/Event Alarm" },
  DC0029: { id: "DC0029", name: "File Modification" },
  DC0051: { id: "DC0051", name: "Command Execution" },
};

export const ASSETS = {
  "plc-01":   { id: "plc-01",   name: "PLC-01 (Reactor)",   type: "PLC",      zone: "Level 1 – Control", ip: "192.168.95.10" },
  "plc-02":   { id: "plc-02",   name: "PLC-02 (Mixer)",     type: "PLC",      zone: "Level 1 – Control", ip: "192.168.95.11" },
  "hmi-01":   { id: "hmi-01",   name: "HMI-01",             type: "HMI",      zone: "Level 2 – Supervisory", ip: "192.168.90.5"  },
  "hist-01":  { id: "hist-01",  name: "Historian",          type: "Server",   zone: "Level 3 – Operations",  ip: "192.168.90.20" },
  "ew-01":    { id: "ew-01",    name: "Engineering WS-01",  type: "Workstation", zone: "Level 3 – Operations", ip: "192.168.90.50" },
  "rtu-01":   { id: "rtu-01",   name: "RTU-01",             type: "RTU",      zone: "Level 1 – Control", ip: "192.168.95.30" },
  "jump-01":  { id: "jump-01",  name: "Jump Host",          type: "Server",   zone: "Level 3.5 – DMZ",   ip: "10.10.30.4"    },
};

/* ──────────────────────────────────────────────────────────────────────── */
/* Attack chains (Layer B — causal-window Transformer recognitions)         */
/* ──────────────────────────────────────────────────────────────────────── */

export const CHAINS = [
  {
    id: "chain-10",
    name: "Chain 10 · Unauthorized Process Parameter Manipulation",
    status: "active",
    severity: "critical",
    confidence: 0.94,
    startedAt: "2026-04-24T12:48:12Z",
    lastSeenAt: "2026-04-24T13:21:44Z",
    alertsCount: 27,
    killChainProgress: 0.82,
    tactics: ["TA0108", "TA0102b", "TA0109", "TA0104", "TA0105"],
    techniques: ["T0883", "T0846", "T0886", "T0831", "T0836"],
    attackerAssets: ["10.10.30.99"],
    targetAssets: ["jump-01", "ew-01", "hmi-01", "plc-01"],
    summary:
      "Remote foothold on the Jump Host escalated through an Engineering Workstation into HMI and PLC-01. Modbus writes to holding registers manipulated reactor setpoints while the HMI alarm queue was silenced.",
    steps: [
      {
        ts: "2026-04-24T12:48:12Z",
        tactic: "TA0108",
        technique: "T0883",
        title: "Internet-Accessible Device → Jump Host login",
        dc: "DC0067",
        asset: "jump-01",
        confidence: 0.91,
        evidence: "SSH accepted password for `svc-ops` from 10.10.30.99 (non-whitelisted).",
      },
      {
        ts: "2026-04-24T12:53:41Z",
        tactic: "TA0102b",
        technique: "T0846",
        title: "Remote System Discovery — internal port scan",
        dc: "DC0082",
        asset: "jump-01",
        confidence: 0.88,
        evidence: "142 NEW connections from jump-01 to 192.168.90.0/24 within 40s.",
      },
      {
        ts: "2026-04-24T13:02:09Z",
        tactic: "TA0109",
        technique: "T0886",
        title: "Remote Services — WinRM to Engineering WS",
        dc: "DC0067",
        asset: "ew-01",
        confidence: 0.86,
        evidence: "Interactive logon session created on ew-01 from jump-01.",
      },
      {
        ts: "2026-04-24T13:09:22Z",
        tactic: "TA0104",
        technique: "T0831",
        title: "Manipulation of Control — setpoint writes",
        dc: "DC0078",
        asset: "plc-01",
        confidence: 0.96,
        evidence: "Modbus FC=16 bursts to register 40023 (reactor setpoint) from ew-01.",
      },
      {
        ts: "2026-04-24T13:15:03Z",
        tactic: "TA0106",
        technique: "T0878",
        title: "Alarm Suppression — HMI alarm queue silenced",
        dc: "DC0109",
        asset: "hmi-01",
        confidence: 0.83,
        evidence: "HMI alarm acknowledgements spike while operator is not at console.",
      },
      {
        ts: "2026-04-24T13:21:44Z",
        tactic: "TA0105",
        technique: "T0836",
        title: "Modify Parameter — sustained out-of-band writes",
        dc: "DC0078",
        asset: "plc-01",
        confidence: 0.92,
        evidence: "Sustained writes keep setpoint outside safety envelope for 6m12s.",
      },
    ],
  },
  {
    id: "chain-01",
    name: "Chain 1 · Ransomware-style Staging on OT",
    status: "contained",
    severity: "high",
    confidence: 0.87,
    startedAt: "2026-04-23T21:12:00Z",
    lastSeenAt: "2026-04-23T22:05:36Z",
    alertsCount: 18,
    killChainProgress: 0.60,
    tactics: ["TA0108", "TA0102", "TA0110", "TA0100"],
    techniques: ["T0819", "T0853", "T0859", "T0811"],
    attackerAssets: ["10.10.30.77"],
    targetAssets: ["hist-01", "ew-01"],
    summary:
      "Phishing-delivered implant on the Engineering WS staged encryption tooling on the Historian share. Contained by isolation of ew-01 before PLC reach.",
    steps: [
      {
        ts: "2026-04-23T21:12:00Z",
        tactic: "TA0108",
        technique: "T0819",
        title: "Exploit Public-Facing Application",
        dc: "DC0038",
        asset: "ew-01",
        confidence: 0.84,
        evidence: "Malicious macro payload executed from email attachment.",
      },
      {
        ts: "2026-04-23T21:24:00Z",
        tactic: "TA0102",
        technique: "T0853",
        title: "Scripting — PowerShell downloader",
        dc: "DC0051",
        asset: "ew-01",
        confidence: 0.81,
        evidence: "Encoded PowerShell spawned by Office process.",
      },
      {
        ts: "2026-04-23T21:37:00Z",
        tactic: "TA0110",
        technique: "T0859",
        title: "Valid Accounts — service account reuse",
        dc: "DC0067",
        asset: "hist-01",
        confidence: 0.79,
        evidence: "Same svc-historian session from two assets within 30s.",
      },
      {
        ts: "2026-04-23T22:05:36Z",
        tactic: "TA0100",
        technique: "T0811",
        title: "Data from Information Repositories",
        dc: "DC0029",
        asset: "hist-01",
        confidence: 0.76,
        evidence: "Bulk read + write on Historian share by non-operational account.",
      },
    ],
  },
  {
    id: "chain-04",
    name: "Chain 4 · Reconnaissance & Network Sniffing",
    status: "monitoring",
    severity: "medium",
    confidence: 0.71,
    startedAt: "2026-04-24T09:02:14Z",
    lastSeenAt: "2026-04-24T09:44:50Z",
    alertsCount: 9,
    killChainProgress: 0.25,
    tactics: ["TA0102b", "TA0101"],
    techniques: ["T0842", "T0840"],
    attackerAssets: ["192.168.90.77"],
    targetAssets: ["plc-01", "plc-02", "rtu-01"],
    summary:
      "Passive network sniffing and Modbus discovery probes. No write attempts observed; monitoring continues.",
    steps: [
      {
        ts: "2026-04-24T09:02:14Z",
        tactic: "TA0102b",
        technique: "T0840",
        title: "Network Connection Enumeration",
        dc: "DC0082",
        asset: "plc-01",
        confidence: 0.68,
        evidence: "Sequential TCP/502 probes from 192.168.90.77 to L1 subnet.",
      },
      {
        ts: "2026-04-24T09:44:50Z",
        tactic: "TA0101",
        technique: "T0842",
        title: "Network Sniffing",
        dc: "DC0078",
        asset: "rtu-01",
        confidence: 0.72,
        evidence: "SPAN port traffic shows unsolicited ARP replies.",
      },
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────────── */
/* Alerts (orchestrator.OrchestratedDecision projection)                    */
/* ──────────────────────────────────────────────────────────────────────── */

export const ALERTS = [
  {
    id: "alert-0001",
    timestamp: "2026-04-24T13:21:44Z",
    assetId: "plc-01",
    datacomponent: "DC0078",
    techniqueIds: ["T0836", "T0831"],
    tacticIds: ["TA0105", "TA0104"],
    severity: "critical",
    message: "Modbus FC=16 bursts to register 40023 (reactor setpoint) sustained 6m12s",
    signalScore: 0.94,
    chainId: "chain-10",
    layerA: { pTruePositive: 0.97, decision: "keep", usedSafetyRail: false, driftAlarm: false },
    layerB: { chainId: "chain-10", confidence: 0.93, techniques: ["T0836", "T0831"], tactics: ["TA0105", "TA0104"] },
    layerC: { action: "escalate", confidence: 0.91, rationale: "Layer A high p(TP) + Layer B high-confidence chain", usedSafetyRail: false, avarHit: false },
    layerD: { ready: true },
    srcIps: ["192.168.90.50"],
    destIps: ["192.168.95.10"],
    rawLog:
      "tcp src=192.168.90.50 dst=192.168.95.10 dport=502 modbus.func_code=16 modbus.register=40023 modbus.value=1337 count=12",
  },
  {
    id: "alert-0002",
    timestamp: "2026-04-24T13:15:03Z",
    assetId: "hmi-01",
    datacomponent: "DC0109",
    techniqueIds: ["T0878"],
    tacticIds: ["TA0106"],
    severity: "high",
    message: "HMI alarm acknowledgements spike while operator console idle",
    signalScore: 0.83,
    chainId: "chain-10",
    layerA: { pTruePositive: 0.88, decision: "keep", usedSafetyRail: false, driftAlarm: false },
    layerB: { chainId: "chain-10", confidence: 0.81, techniques: ["T0878"], tactics: ["TA0106"] },
    layerC: { action: "escalate", confidence: 0.80, rationale: "Matches active chain-10 progression", usedSafetyRail: false, avarHit: false },
    layerD: { ready: true },
    srcIps: [],
    destIps: [],
    rawLog:
      "hmi.alarm_ack_burst count=34 within=30s operator=none asset=hmi-01",
  },
  {
    id: "alert-0003",
    timestamp: "2026-04-24T13:09:22Z",
    assetId: "plc-01",
    datacomponent: "DC0078",
    techniqueIds: ["T0831"],
    tacticIds: ["TA0104"],
    severity: "critical",
    message: "Unexpected Modbus write to safety-relevant register 40023",
    signalScore: 0.92,
    chainId: "chain-10",
    layerA: { pTruePositive: 0.95, decision: "keep", usedSafetyRail: true, driftAlarm: false },
    layerB: { chainId: "chain-10", confidence: 0.90, techniques: ["T0831"], tactics: ["TA0104"] },
    layerC: { action: "escalate", confidence: 0.93, rationale: "Safety-rail trigger: write to protected register list", usedSafetyRail: true, avarHit: false },
    layerD: { ready: true },
    srcIps: ["192.168.90.50"],
    destIps: ["192.168.95.10"],
    rawLog:
      "tcp src=192.168.90.50 dst=192.168.95.10 dport=502 modbus.func_code=16 modbus.register=40023",
  },
  {
    id: "alert-0004",
    timestamp: "2026-04-24T13:02:09Z",
    assetId: "ew-01",
    datacomponent: "DC0067",
    techniqueIds: ["T0886"],
    tacticIds: ["TA0109"],
    severity: "high",
    message: "WinRM interactive logon from Jump Host to Engineering WS",
    signalScore: 0.86,
    chainId: "chain-10",
    layerA: { pTruePositive: 0.89, decision: "keep", usedSafetyRail: false, driftAlarm: false },
    layerB: { chainId: "chain-10", confidence: 0.78, techniques: ["T0886"], tactics: ["TA0109"] },
    layerC: { action: "review", confidence: 0.76, rationale: "Ambiguity band — analyst confirmation recommended", usedSafetyRail: false, avarHit: false },
    layerD: { ready: true },
    srcIps: ["10.10.30.4"],
    destIps: ["192.168.90.50"],
    rawLog:
      "win.evtx.logon src=10.10.30.4 user=svc-eng auth=NTLM logon_type=10",
  },
  {
    id: "alert-0005",
    timestamp: "2026-04-24T12:53:41Z",
    assetId: "jump-01",
    datacomponent: "DC0082",
    techniqueIds: ["T0846"],
    tacticIds: ["TA0102b"],
    severity: "medium",
    message: "Rapid outbound connection fan-out from Jump Host",
    signalScore: 0.72,
    chainId: "chain-10",
    layerA: { pTruePositive: 0.81, decision: "keep", usedSafetyRail: false, driftAlarm: false },
    layerB: { chainId: "chain-10", confidence: 0.70, techniques: ["T0846"], tactics: ["TA0102b"] },
    layerC: { action: "monitor", confidence: 0.65, rationale: "Reconnaissance pattern, low immediate risk", usedSafetyRail: false, avarHit: false },
    layerD: { ready: true },
    srcIps: ["10.10.30.4"],
    destIps: ["192.168.90.0/24"],
    rawLog:
      "netflow src=10.10.30.4 new_conns=142 window=40s dst_subnet=192.168.90.0/24",
  },
  {
    id: "alert-0006",
    timestamp: "2026-04-24T09:44:50Z",
    assetId: "rtu-01",
    datacomponent: "DC0078",
    techniqueIds: ["T0842"],
    tacticIds: ["TA0101"],
    severity: "medium",
    message: "Unsolicited ARP replies observed on SPAN port",
    signalScore: 0.68,
    chainId: "chain-04",
    layerA: { pTruePositive: 0.73, decision: "keep", usedSafetyRail: false, driftAlarm: false },
    layerB: { chainId: "chain-04", confidence: 0.66, techniques: ["T0842"], tactics: ["TA0101"] },
    layerC: { action: "monitor", confidence: 0.62, rationale: "Reconnaissance pattern", usedSafetyRail: false, avarHit: false },
    layerD: { ready: true },
    srcIps: ["192.168.90.77"],
    destIps: [],
    rawLog: "arp.reply src=192.168.90.77 unsolicited=true count=8",
  },
  {
    id: "alert-0007",
    timestamp: "2026-04-23T22:05:36Z",
    assetId: "hist-01",
    datacomponent: "DC0029",
    techniqueIds: ["T0811"],
    tacticIds: ["TA0100"],
    severity: "high",
    message: "Bulk file read/write by non-operational account on Historian share",
    signalScore: 0.78,
    chainId: "chain-01",
    layerA: { pTruePositive: 0.85, decision: "keep", usedSafetyRail: false, driftAlarm: false },
    layerB: { chainId: "chain-01", confidence: 0.74, techniques: ["T0811"], tactics: ["TA0100"] },
    layerC: { action: "escalate", confidence: 0.79, rationale: "Matches chain-01 staging pattern", usedSafetyRail: false, avarHit: false },
    layerD: { ready: true },
    srcIps: ["192.168.90.50"],
    destIps: ["192.168.90.20"],
    rawLog:
      "smb.read count=812 smb.write count=44 user=svc-historian src=192.168.90.50",
  },
  {
    id: "alert-0008",
    timestamp: "2026-04-23T21:24:00Z",
    assetId: "ew-01",
    datacomponent: "DC0051",
    techniqueIds: ["T0853"],
    tacticIds: ["TA0102"],
    severity: "high",
    message: "Encoded PowerShell spawned by Office process",
    signalScore: 0.81,
    chainId: "chain-01",
    layerA: { pTruePositive: 0.90, decision: "keep", usedSafetyRail: true, driftAlarm: false },
    layerB: { chainId: "chain-01", confidence: 0.78, techniques: ["T0853"], tactics: ["TA0102"] },
    layerC: { action: "escalate", confidence: 0.84, rationale: "Safety-rail trigger: recall-floor match", usedSafetyRail: true, avarHit: false },
    layerD: { ready: true },
    srcIps: [],
    destIps: [],
    rawLog:
      "process.create parent=winword.exe image=powershell.exe cmdline=\"-EncodedCommand ...\"",
  },
  {
    id: "alert-0009",
    timestamp: "2026-04-24T12:48:12Z",
    assetId: "jump-01",
    datacomponent: "DC0067",
    techniqueIds: ["T0883"],
    tacticIds: ["TA0108"],
    severity: "high",
    message: "SSH accepted password from non-whitelisted source",
    signalScore: 0.79,
    chainId: "chain-10",
    layerA: { pTruePositive: 0.86, decision: "keep", usedSafetyRail: false, driftAlarm: false },
    layerB: { chainId: "chain-10", confidence: 0.71, techniques: ["T0883"], tactics: ["TA0108"] },
    layerC: { action: "escalate", confidence: 0.77, rationale: "Chain entry on Internet-exposed asset", usedSafetyRail: false, avarHit: false },
    layerD: { ready: true },
    srcIps: ["10.10.30.99"],
    destIps: ["10.10.30.4"],
    rawLog:
      "sshd: Accepted password for svc-ops from 10.10.30.99 port 51984",
  },
  {
    id: "alert-0010",
    timestamp: "2026-04-24T13:30:01Z",
    assetId: "plc-02",
    datacomponent: "DC0109",
    techniqueIds: [],
    tacticIds: [],
    severity: "low",
    message: "Process/Event Alarm: temperature deviation (within control band)",
    signalScore: 0.41,
    chainId: null,
    layerA: { pTruePositive: 0.22, decision: "suppress", usedSafetyRail: false, driftAlarm: false },
    layerB: { chainId: null, confidence: 0.0, techniques: [], tactics: [] },
    layerC: { action: "drop", confidence: 0.85, rationale: "AVAR: analyst previously marked similar events benign", usedSafetyRail: false, avarHit: true },
    layerD: { ready: false },
    srcIps: [],
    destIps: [],
    rawLog: "plc.alarm temp_deviation=2.3C asset=plc-02 control_band_ok=true",
  },
];

/* ──────────────────────────────────────────────────────────────────────── */
/* Logs (ingestion / normalisation feed)                                    */
/* ──────────────────────────────────────────────────────────────────────── */

export const LOGS = [
  {
    id: "log-0001",
    timestamp: "2026-04-24T13:21:44Z",
    source: "suricata",
    level: "alert",
    assetId: "plc-01",
    datacomponent: "DC0078",
    message:
      "ET MODBUS Unauthorized Function Code 16 write to register 40023 from 192.168.90.50",
    alertId: "alert-0001",
  },
  {
    id: "log-0002",
    timestamp: "2026-04-24T13:21:40Z",
    source: "filebeat/modbus",
    level: "info",
    assetId: "plc-01",
    datacomponent: "DC0078",
    message: "modbus.func_code=16 register=40023 value=1337 src=192.168.90.50 dst=192.168.95.10",
    alertId: "alert-0001",
  },
  {
    id: "log-0003",
    timestamp: "2026-04-24T13:15:03Z",
    source: "hmi.app",
    level: "warn",
    assetId: "hmi-01",
    datacomponent: "DC0109",
    message: "Alarm acknowledgement burst: 34 alarms silenced in 30s by unattended console",
    alertId: "alert-0002",
  },
  {
    id: "log-0004",
    timestamp: "2026-04-24T13:02:09Z",
    source: "winlogbeat",
    level: "info",
    assetId: "ew-01",
    datacomponent: "DC0067",
    message: "Event 4624 logon_type=10 user=svc-eng src=10.10.30.4",
    alertId: "alert-0004",
  },
  {
    id: "log-0005",
    timestamp: "2026-04-24T12:53:41Z",
    source: "netflow",
    level: "info",
    assetId: "jump-01",
    datacomponent: "DC0082",
    message: "connection fan-out: 142 NEW dst in 40s to 192.168.90.0/24",
    alertId: "alert-0005",
  },
  {
    id: "log-0006",
    timestamp: "2026-04-24T12:48:12Z",
    source: "sshd",
    level: "info",
    assetId: "jump-01",
    datacomponent: "DC0067",
    message: "Accepted password for svc-ops from 10.10.30.99 port 51984",
    alertId: "alert-0009",
  },
  {
    id: "log-0007",
    timestamp: "2026-04-24T13:30:01Z",
    source: "plc.alarm",
    level: "info",
    assetId: "plc-02",
    datacomponent: "DC0109",
    message: "Temperature deviation 2.3C within control band (benign)",
    alertId: "alert-0010",
  },
  {
    id: "log-0008",
    timestamp: "2026-04-24T09:44:50Z",
    source: "suricata",
    level: "alert",
    assetId: "rtu-01",
    datacomponent: "DC0078",
    message: "ET SCAN Sequential Modbus probes TCP/502 from 192.168.90.77",
    alertId: "alert-0006",
  },
  {
    id: "log-0009",
    timestamp: "2026-04-23T22:05:36Z",
    source: "smb.audit",
    level: "warn",
    assetId: "hist-01",
    datacomponent: "DC0029",
    message: "Bulk SMB read=812 write=44 by svc-historian from 192.168.90.50",
    alertId: "alert-0007",
  },
  {
    id: "log-0010",
    timestamp: "2026-04-23T21:24:00Z",
    source: "sysmon",
    level: "alert",
    assetId: "ew-01",
    datacomponent: "DC0051",
    message:
      "Process create: parent=winword.exe image=powershell.exe args=-EncodedCommand (Base64)",
    alertId: "alert-0008",
  },
  {
    id: "log-0011",
    timestamp: "2026-04-24T13:20:11Z",
    source: "snmp",
    level: "info",
    assetId: "plc-01",
    datacomponent: null,
    message: "SNMP poll heartbeat OK",
    alertId: null,
  },
  {
    id: "log-0012",
    timestamp: "2026-04-24T13:18:02Z",
    source: "filebeat/modbus",
    level: "info",
    assetId: "plc-02",
    datacomponent: "DC0078",
    message: "modbus.func_code=3 register=30012 count=1 src=192.168.90.5 (HMI read)",
    alertId: null,
  },
  {
    id: "log-0013",
    timestamp: "2026-04-24T13:12:18Z",
    source: "winlogbeat",
    level: "info",
    assetId: "ew-01",
    datacomponent: "DC0090",
    message: "Event 4688 process create: cmd.exe (operator shell)",
    alertId: null,
  },
];

/* ──────────────────────────────────────────────────────────────────────── */
/* Mitigations (Layer D — KG-grounded multi-agent LLM output)               */
/* ──────────────────────────────────────────────────────────────────────── */

export const MITIGATIONS = [
  {
    id: "mit-chain10-01",
    chainId: "chain-10",
    alertIds: ["alert-0001", "alert-0003"],
    title: "Enforce Modbus write-protection for reactor setpoint registers",
    priority: "critical",
    appliesToTechniques: ["T0831", "T0836"],
    appliesToAssets: ["plc-01"],
    appliesToZones: ["Level 1 – Control"],
    kgMitigationId: "M0800",
    kgMitigationName: "Network Segmentation",
    rationale:
      "Writes to safety-relevant Modbus holding registers should never originate from workstations at Level 3. Enforcing write-protection at the PLC and at the L2/L3 boundary stops the observed manipulation pattern with no operational impact.",
    implementation: [
      "On PLC-01, enable register-range write-protection for 40020–40030 via vendor engineering console.",
      "On the L2/L3 firewall, block Modbus FC=5,6,15,16 from 192.168.90.0/24 to 192.168.95.10.",
      "Whitelist write-capable HMI-01 (192.168.90.5) explicitly, logging every accepted write.",
    ],
    approvalRequired: true,
    rollback:
      "Temporarily re-enable write-access (revert firewall rule + PLC write-protect) during scheduled maintenance; restore immediately after.",
    status: "proposed",
    sources: [
      { type: "MITRE ATT&CK ICS", id: "M0800", label: "Network Segmentation" },
      { type: "IEC 62443-3-3", id: "SR 3.1", label: "Communication integrity" },
    ],
    requiresHumanApproval: true,
    grounding: { kgPath: ["T0831", "mitigates", "M0800"], retrievedAt: "2026-04-24T13:22:10Z" },
  },
  {
    id: "mit-chain10-02",
    chainId: "chain-10",
    alertIds: ["alert-0002"],
    title: "Detect & preserve HMI alarm-queue tampering",
    priority: "high",
    appliesToTechniques: ["T0878"],
    appliesToAssets: ["hmi-01"],
    appliesToZones: ["Level 2 – Supervisory"],
    kgMitigationId: "M0816",
    kgMitigationName: "Mitigation Limit Access to Resource Over Network",
    rationale:
      "Alarm acknowledgements while the operator console is unattended indicate programmatic suppression. Forwarding alarm events to an out-of-band store ensures tampering is recoverable.",
    implementation: [
      "Forward HMI alarm journal to the SIEM via syslog over TLS (append-only sink).",
      "Alert when alarm ACK rate exceeds 10/min without operator session activity.",
      "Restrict alarm-ACK API to console-local users only.",
    ],
    approvalRequired: false,
    rollback: "Disable forwarding and the rate-based rule; no state change on HMI.",
    status: "proposed",
    sources: [
      { type: "MITRE ATT&CK ICS", id: "M0816", label: "Limit Access to Resource Over Network" },
    ],
    requiresHumanApproval: false,
    grounding: { kgPath: ["T0878", "mitigates", "M0816"], retrievedAt: "2026-04-24T13:22:10Z" },
  },
  {
    id: "mit-chain10-03",
    chainId: "chain-10",
    alertIds: ["alert-0004", "alert-0009"],
    title: "Harden Jump Host: MFA + source-IP allow-list for remote access",
    priority: "high",
    appliesToTechniques: ["T0883", "T0886"],
    appliesToAssets: ["jump-01", "ew-01"],
    appliesToZones: ["Level 3.5 – DMZ", "Level 3 – Operations"],
    kgMitigationId: "M0932",
    kgMitigationName: "Multi-factor Authentication",
    rationale:
      "The chain started with a password-only SSH session from an unknown source. Enforcing MFA and an allow-list on the Jump Host eliminates the entry point.",
    implementation: [
      "Enable TOTP MFA on the Jump Host for all interactive logins.",
      "Restrict inbound TCP/22 to the vendor maintenance subnet only.",
      "Disable WinRM from DMZ → Operations; require session-brokered access via the jump host.",
    ],
    approvalRequired: true,
    rollback: "Disable MFA and remove allow-list only during declared emergency access.",
    status: "approved",
    sources: [
      { type: "MITRE ATT&CK ICS", id: "M0932", label: "Multi-factor Authentication" },
      { type: "NIST SP 800-82 r3", id: "5.3", label: "Remote access controls" },
    ],
    requiresHumanApproval: true,
    grounding: { kgPath: ["T0883", "mitigates", "M0932"], retrievedAt: "2026-04-24T13:22:11Z" },
  },
  {
    id: "mit-chain01-01",
    chainId: "chain-01",
    alertIds: ["alert-0008"],
    title: "Block encoded PowerShell from Office children on Engineering WS",
    priority: "high",
    appliesToTechniques: ["T0853"],
    appliesToAssets: ["ew-01"],
    appliesToZones: ["Level 3 – Operations"],
    kgMitigationId: "M0938",
    kgMitigationName: "Execution Prevention",
    rationale:
      "Encoded PowerShell spawned from an Office process is almost always malicious in an OT environment. An attack-surface reduction rule terminates it before staging completes.",
    implementation: [
      "Enable ASR rule ‘Block Office apps from creating child processes’ on ew-01.",
      "Enable PowerShell Script Block Logging (Event 4104) with SIEM forwarding.",
      "Add SIEM rule: Office parent → PowerShell with -EncodedCommand → severity=high.",
    ],
    approvalRequired: false,
    rollback: "Disable ASR rule via GPO; no residual artefacts.",
    status: "implemented",
    sources: [
      { type: "MITRE ATT&CK ICS", id: "M0938", label: "Execution Prevention" },
    ],
    requiresHumanApproval: false,
    grounding: { kgPath: ["T0853", "mitigates", "M0938"], retrievedAt: "2026-04-23T22:07:18Z" },
  },
  {
    id: "mit-chain01-02",
    chainId: "chain-01",
    alertIds: ["alert-0007"],
    title: "Enforce least-privilege on Historian shares",
    priority: "medium",
    appliesToTechniques: ["T0811", "T0859"],
    appliesToAssets: ["hist-01"],
    appliesToZones: ["Level 3 – Operations"],
    kgMitigationId: "M0926",
    kgMitigationName: "Privileged Account Management",
    rationale:
      "Bulk SMB reads/writes by a service account reused across assets indicate over-broad credentials. Tightening permissions and adding per-asset service accounts contains lateral reuse.",
    implementation: [
      "Split svc-historian into read-only and write service accounts; scope by share path.",
      "Rotate credentials and remove cached tokens on ew-01 and hist-01.",
      "Enable SMB auditing + data-exfil detection (>100 files in 60s).",
    ],
    approvalRequired: true,
    rollback: "Merge accounts back temporarily via change ticket; re-apply within 24h.",
    status: "proposed",
    sources: [
      { type: "MITRE ATT&CK ICS", id: "M0926", label: "Privileged Account Management" },
    ],
    requiresHumanApproval: true,
    grounding: { kgPath: ["T0811", "mitigates", "M0926"], retrievedAt: "2026-04-23T22:07:18Z" },
  },
  {
    id: "mit-chain04-01",
    chainId: "chain-04",
    alertIds: ["alert-0006"],
    title: "Detect and rate-limit Modbus discovery probes at L2 boundary",
    priority: "medium",
    appliesToTechniques: ["T0840", "T0842"],
    appliesToAssets: ["plc-01", "plc-02", "rtu-01"],
    appliesToZones: ["Level 1 – Control"],
    kgMitigationId: "M0931",
    kgMitigationName: "Network Intrusion Prevention",
    rationale:
      "Systematic TCP/502 probes to Level-1 assets are a classic precursor. Rate-limiting and alerting at the L2 switch reduces attacker visibility without affecting legitimate polling.",
    implementation: [
      "Add Suricata rule for sequential TCP/502 across >5 hosts in 30s.",
      "On L2 switch, enable port-based rate-limit (500pps) for TCP/502.",
      "Route alert to ‘Reconnaissance’ playbook in SOAR.",
    ],
    approvalRequired: false,
    rollback: "Disable Suricata rule + rate-limit.",
    status: "proposed",
    sources: [
      { type: "MITRE ATT&CK ICS", id: "M0931", label: "Network Intrusion Prevention" },
    ],
    requiresHumanApproval: false,
    grounding: { kgPath: ["T0840", "mitigates", "M0931"], retrievedAt: "2026-04-24T09:46:12Z" },
  },
];

/* ──────────────────────────────────────────────────────────────────────── */
/* Dashboard stats (aggregated KPIs)                                        */
/* ──────────────────────────────────────────────────────────────────────── */

export const DASHBOARD_STATS = {
  activeChains: 2,
  containedChains: 1,
  alertsLast24h: 142,
  criticalAlerts24h: 6,
  mitigationsProposed: 4,
  mitigationsImplemented: 1,
  falsePositiveRate: 0.063,
  avgLatencyMs: 184,
  p95LatencyMs: 412,
  classifierAUROC: 0.946,
  avarEntries: 128,
  driftAlarms: 0,
  alertsPerHour: [6, 4, 5, 3, 4, 8, 12, 9, 14, 22, 18, 11, 16, 24, 19, 12, 9, 7, 10, 14, 17, 21, 26, 31],
  tacticsDistribution: [
    { tactic: "TA0108", label: "Initial Access",        count: 18 },
    { tactic: "TA0102", label: "Execution",             count: 12 },
    { tactic: "TA0102b", label: "Discovery",            count: 22 },
    { tactic: "TA0109", label: "Lateral Movement",      count: 9  },
    { tactic: "TA0104", label: "Impair Process Control",count: 7  },
    { tactic: "TA0106", label: "Inhibit Response",      count: 5  },
    { tactic: "TA0105", label: "Impact",                count: 4  },
  ],
  assetHeat: [
    { assetId: "plc-01",  count: 34 },
    { assetId: "hmi-01",  count: 21 },
    { assetId: "ew-01",   count: 17 },
    { assetId: "jump-01", count: 12 },
    { assetId: "hist-01", count: 9  },
    { assetId: "rtu-01",  count: 6  },
    { assetId: "plc-02",  count: 3  },
  ],
  triageActions: {
    escalate: 41,
    review:   27,
    monitor:  38,
    drop:     36,
  },
  recentFeedback: [
    { at: "2026-04-24T13:21:00Z", analyst: "A. Benali",  verdict: "confirmed", alertId: "alert-0001" },
    { at: "2026-04-24T13:10:00Z", analyst: "R. Novak",   verdict: "confirmed", alertId: "alert-0003" },
    { at: "2026-04-24T10:02:00Z", analyst: "S. Martin",  verdict: "benign",    alertId: "alert-0010" },
  ],
};

/* ──────────────────────────────────────────────────────────────────────── */
/* Selectors (tiny helpers to keep pages clean)                             */
/* ──────────────────────────────────────────────────────────────────────── */

export function getChainById(id) {
  return CHAINS.find((c) => c.id === id) || null;
}

export function getAlertsForChain(chainId) {
  return ALERTS.filter((a) => a.chainId === chainId);
}

export function getMitigationsForChain(chainId) {
  return MITIGATIONS.filter((m) => m.chainId === chainId);
}

export function getLogsForAlert(alertId) {
  return LOGS.filter((l) => l.alertId === alertId);
}

export function tacticOf(id) {
  return TACTICS[id] || { id, name: id, tone: "slate" };
}

export function dcOf(id) {
  return DATA_COMPONENTS[id] || { id, name: id };
}

export function assetOf(id) {
  return ASSETS[id] || { id, name: id, type: "Unknown", zone: "—", ip: "—" };
}
