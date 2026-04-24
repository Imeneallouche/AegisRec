import { request } from "./client";

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
 */

export const detectionApi = {
  health(baseUrl, timeoutMs) {
    return request(baseUrl, "/health", { timeoutMs });
  },
  snapshot(baseUrl, timeoutMs) {
    return request(baseUrl, "/snapshot", { timeoutMs });
  },
  pollTick(baseUrl, timeoutMs) {
    return request(baseUrl, "/poll/tick", { method: "POST", timeoutMs });
  },
  submitFeedback(baseUrl, payload, timeoutMs) {
    return request(baseUrl, "/alerts/feedback", {
      method: "POST",
      body: payload,
      timeoutMs,
    });
  },
  scoreAlert(baseUrl, payload, timeoutMs) {
    return request(baseUrl, "/alerts/score", {
      method: "POST",
      body: payload,
      timeoutMs,
    });
  },
  batchAlerts(baseUrl, payload, timeoutMs) {
    return request(baseUrl, "/alerts/batch", {
      method: "POST",
      body: payload,
      timeoutMs,
    });
  },
};
