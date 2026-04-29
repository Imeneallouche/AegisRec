import { request, EngineError } from "./client";
import { resolveDetectionEngineBaseUrl } from "../utils/engineBaseUrl";

/**
 * Typed wrappers for the Python learning service (see `learning/api.py`).
 *
 * Canonical endpoints:
 *   GET  /health                  → liveness + per-layer status
 *   GET  /snapshot                → chains + alerts + logs + mitigations + stats
 *   POST /alerts/score            → single-alert scoring
 *   POST /alerts/batch            → batch scoring
 *   POST /alerts/feedback         → analyst verdict for AVAR
 *   POST /poll/tick               → ask the orchestrator to poll Elasticsearch
 *
 * If the backend does not yet expose /snapshot, callers should treat a 404 as
 * a signal that the engine is running but data plumbing is incomplete and
 * render the same "offline" fallback; see EngineContext for the logic.
 *
 * All methods normalize baseUrl so port 8000 is not used as the ICS engine in dev
 * (that port is the AegisRec API). MITRE learning defaults to port 8090.
 */

function engineBase(baseUrl) {
  return resolveDetectionEngineBaseUrl(baseUrl);
}

export const detectionApi = {
  health(baseUrl, timeoutMs) {
    return request(engineBase(baseUrl), "/health", { timeoutMs }).then((data) => {
      if (data?.service === "aegisrec-api") {
        throw new EngineError(
          "Engine URL targets the AegisRec API. Set Engine URL to the MITRE learning service (default http://127.0.0.1:8090).",
          { kind: "http", status: 400 },
        );
      }
      return data;
    });
  },
  snapshot(baseUrl, timeoutMs) {
    return request(engineBase(baseUrl), "/snapshot", { timeoutMs });
  },
  pollTick(baseUrl, timeoutMs) {
    return request(engineBase(baseUrl), "/poll/tick", { method: "POST", timeoutMs });
  },
  submitFeedback(baseUrl, payload, timeoutMs) {
    return request(engineBase(baseUrl), "/alerts/feedback", {
      method: "POST",
      body: payload,
      timeoutMs,
    });
  },
  scoreAlert(baseUrl, payload, timeoutMs) {
    return request(engineBase(baseUrl), "/alerts/score", {
      method: "POST",
      body: payload,
      timeoutMs,
    });
  },
  batchAlerts(baseUrl, payload, timeoutMs) {
    return request(engineBase(baseUrl), "/alerts/batch", {
      method: "POST",
      body: payload,
      timeoutMs,
    });
  },
};
