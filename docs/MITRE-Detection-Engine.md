# MITRE ICS detection engine integration (AegisRec)

AegisRec is a **React + FastAPI** analyst portal; the **deterministic detector** and the optional **learning orchestrator** run in the separate **`MITRE-ATTACK-for-ICS-Detection-and-Correlation-Engine`** repository. The UI discovers health, polls for work, scores alerts, and sends feedback via HTTP only.

---

## 1. Ports and URLs (development)

| Service | Typical URL | Role |
|---------|-------------|------|
| AegisRec API | `http://127.0.0.1:8000` | Site auth, persisted alerts, assistant. |
| AegisRec UI | `http://localhost:3000` | Dashboard (see **Settings → Engine URL**). |
| MITRE learning API | `http://127.0.0.1:8090` | `python -m learning.cli serve`; port from `config/learning.yml` → `api.port`. |

**Never** point **Engine URL** at port **8000** — the client rejects responses that identify as `aegisrec-api` (`app/client/src/api/detectionApi.js`).

---

## 2. Endpoints consumed by the client

Canonical wrappers live in **`app/client/src/api/detectionApi.js`**.

| Method | Path | Use |
|--------|------|-----|
| `GET` | `/health` | Liveness + per-layer flags (`layer_a` … `layer_d`). |
| `GET` | `/snapshot` | Optional aggregate snapshot for dashboard (404 is treated as graceful fallback if not implemented server-side). |
| `POST` | `/poll/tick` | Ask orchestrator to run an Elasticsearch ingestion cycle when wired. |
| `POST` | `/alerts/score` | Score a single engine alert `{ "alert": { … }, "run_layer_d": true }`. |
| `POST` | `/alerts/batch` | Batch variant. |
| `POST` | `/alerts/feedback` | Analyst verdict for AVAR / policy (`accept` \| `reject` \| `downgrade` \| `upgrade`). |

Additional MITRE endpoints (for operators, Swagger, or custom UI panels):

| Method | Path | Use |
|--------|------|-----|
| `GET` | `/integration/engine-alert-shape` | Structured list of core/recommended alert JSON keys (`learning/aegis_contract.py`). |
| `POST` | `/diagnostics/mapping-qa` | Body `{ "rows": [ { "gate_passed", "candidate_count", … } ] }` → mapping QA rollup. |
| `POST` | `/alerts/score?validate_alert=true` | Fails fast with `validation_errors` if payloads omit required blocks. |

---

## 3. Alert document expectations

Python engine documents indexed as **`ics-alerts-*`** are consumed by **`FeatureBuilder`** in the MITRE repo. Important fields:

* **Required for strict validation:** `detection_id`, `timestamp`, `similarity_score`.
* **Signals:** `signal_scores` (canonical); **`signals`** is an **equivalent duplicate** emitted for backward compatibility (`engine/alerting.py` → `alert_to_document`).
* **Techniques:** Nested `technique` object when Neo4j or fallback mapper populated.
* **Extensions (optional, when enabled in detection.yml):** `detection_metadata.investigation_graph`, `detection_metadata.explainability`.

CORS for browser calls is controlled by **`api.cors_origins`** in MITRE **`config/learning.yml`**.

---

## 4. Running the MITRE stack (summary)

See the MITRE **`README.md`** and **`docs/End-to-End-Validation-and-Scripts.md`**:

1. Elasticsearch + Logstash + Filebeat + lab containers (`docker compose …`).
2. **`detection-engine`** service indexes alerts.
3. **`python -m learning.cli serve`** for the API the UI attaches to.

**Soft** lab reset between chains (keep ES data): **`reset_grfics_env.sh`**.  
**Hard** reset (wiping volumes + checkpoint): **`reset_stack.sh`** — use only when you intentionally want a cold store.

---

## 5. Consistency notes

| Term | Meaning |
|------|---------|
| **Engine** | The Python **`python -m engine`** detection & correlation runtime. |
| **Learning service** | FastAPI app in **`learning/api.py`** (Layers A–D orchestration); not the ES poller unless `poll/tick` is wired to `Orchestrator.tick()`. |

This page should stay aligned with **`detectionApi.js`** and MITRE **`learning/api.py`** when endpoints evolve.
