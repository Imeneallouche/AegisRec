import React from "react";

import { detectionApi } from "../api/detectionApi";
import { EngineError } from "../api/client";
import { siteApi } from "../api/siteApi";
import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";

/**
 * Connection state machine:
 *
 *   idle       → no request sent yet (initial render)
 *   loading    → a refresh is in flight
 *   connected  → last refresh succeeded (data + health both present)
 *   offline    → last refresh failed at the network / health layer
 *   degraded   → health OK but /snapshot failed (engine up, data plumbing missing)
 *   demo       → demoMode enabled in settings — served from local fixtures
 *   persisted  → engine unavailable but site-scoped DB snapshot has detection rows
 */

const EMPTY_SNAPSHOT = {
  chains: [],
  alerts: [],
  logs: [],
  mitigations: [],
  stats: null,
  fetchedAt: null,
};

const EngineContext = React.createContext({
  status: "idle",
  health: null,
  data: EMPTY_SNAPSHOT,
  error: null,
  lastUpdated: null,
  refresh: async () => {},
  submitFeedback: async () => {},
  isDemo: false,
  isConnected: false,
  isOffline: true,
});

async function loadDemoSnapshot() {
  const mod = await import("../data/detectionSample");
  return {
    chains: mod.CHAINS,
    alerts: mod.ALERTS,
    logs: mod.LOGS,
    mitigations: mod.MITIGATIONS,
    stats: mod.DASHBOARD_STATS,
    fetchedAt: new Date().toISOString(),
    _tactics: mod.TACTICS,
    _dataComponents: mod.DATA_COMPONENTS,
    _assets: mod.ASSETS,
  };
}

export function coerceSnapshot(raw) {
  if (!raw || typeof raw !== "object") return { ...EMPTY_SNAPSHOT };
  return {
    chains: Array.isArray(raw.chains) ? raw.chains : [],
    alerts: Array.isArray(raw.alerts) ? raw.alerts : [],
    logs: Array.isArray(raw.logs) ? raw.logs : [],
    mitigations: Array.isArray(raw.mitigations) ? raw.mitigations : [],
    stats: raw.stats ?? null,
    fetchedAt: raw.fetched_at || raw.fetchedAt || new Date().toISOString(),
  };
}

function mergeSnapshots(persisted, live) {
  const a = coerceSnapshot(persisted);
  const b = coerceSnapshot(live);

  const mergeList = (left, right) => {
    const byId = new Map();
    for (const item of left || []) {
      if (item && item.id != null) byId.set(item.id, item);
    }
    for (const item of right || []) {
      if (item && item.id != null) byId.set(item.id, item);
    }
    return [...byId.values()];
  };

  const logMerge = [...(a.logs || []), ...(b.logs || [])];
  const seen = new Set();
  const logs = [];
  for (const L of logMerge) {
    const key = L && L.id != null ? String(L.id) : JSON.stringify(L);
    if (!seen.has(key)) {
      seen.add(key);
      logs.push(L);
    }
  }

  return {
    chains: mergeList(a.chains, b.chains),
    alerts: mergeList(a.alerts, b.alerts),
    mitigations: mergeList(a.mitigations, b.mitigations),
    logs,
    stats: b.stats ?? a.stats ?? null,
    fetchedAt: b.fetchedAt || a.fetchedAt || new Date().toISOString(),
    _tactics: b._tactics ?? a._tactics,
    _dataComponents: b._dataComponents ?? a._dataComponents,
    _assets: b._assets ?? a._assets,
  };
}

function snapshotHasDetectionRows(snap) {
  const s = coerceSnapshot(snap);
  return (
    (s.chains?.length || 0) + (s.alerts?.length || 0) + (s.mitigations?.length || 0) > 0
  );
}

async function fetchPersistedSnapshot(token) {
  if (!token) return { ...EMPTY_SNAPSHOT };
  try {
    const raw = await siteApi.getPersistedSnapshot(token);
    return coerceSnapshot(raw);
  } catch {
    return { ...EMPTY_SNAPSHOT };
  }
}

export function EngineProvider({ children }) {
  const { settings } = useSettings();
  const { token: authToken } = useAuth();

  const [status, setStatus] = React.useState("idle");
  const [health, setHealth] = React.useState(null);
  const [data, setData] = React.useState(EMPTY_SNAPSHOT);
  const [error, setError] = React.useState(null);
  const [lastUpdated, setLastUpdated] = React.useState(null);

  const inFlightRef = React.useRef(null);

  const refresh = React.useCallback(
    async ({ silent = false } = {}) => {
      const { engine } = settings;

      if (engine.demoMode) {
        if (!silent) setStatus("loading");
        try {
          const persisted = await fetchPersistedSnapshot(authToken);
          const demo = await loadDemoSnapshot();
          const merged = mergeSnapshots(persisted, demo);
          setData(merged);
          setHealth({
            ok: true,
            demo: true,
            layers: { a: "healthy", b: "healthy", c: "healthy", d: "degraded" },
            neo4j: "connected",
            version: "demo",
          });
          setError(null);
          setLastUpdated(new Date());
          setStatus("demo");
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          setStatus("offline");
        }
        return;
      }

      if (inFlightRef.current) return;
      if (!silent) setStatus((s) => (s === "idle" ? "loading" : s));

      const tick = Symbol("refresh");
      inFlightRef.current = tick;

      try {
        const persisted = await fetchPersistedSnapshot(authToken);

        let live = { ...EMPTY_SNAPSHOT };
        let engineStatus = "offline";
        let snapErrMsg = null;

        try {
          const h = await detectionApi.health(settings.engine.baseUrl, engine.requestTimeoutMs);
          if (inFlightRef.current !== tick) return;
          setHealth(h);
          try {
            const snap = await detectionApi.snapshot(settings.engine.baseUrl, engine.requestTimeoutMs);
            if (inFlightRef.current !== tick) return;
            live = coerceSnapshot(snap);
            engineStatus = "connected";
          } catch (snapErr) {
            if (inFlightRef.current !== tick) return;
            snapErrMsg = snapErr instanceof EngineError ? snapErr.message : String(snapErr);
            engineStatus = "degraded";
          }
        } catch (err) {
          if (inFlightRef.current !== tick) return;
          setHealth(null);
          snapErrMsg = err instanceof EngineError ? err.message : String(err);
          engineStatus = "offline";
        }

        if (inFlightRef.current !== tick) return;

        const merged = mergeSnapshots(persisted, live);
        setData(merged);
        setLastUpdated(new Date());

        if (engineStatus === "connected") {
          setError(null);
          setStatus("connected");
        } else if (engineStatus === "degraded") {
          setError(snapErrMsg);
          setStatus(snapshotHasDetectionRows(merged) ? "persisted" : "degraded");
        } else {
          setError(snapErrMsg);
          setStatus(snapshotHasDetectionRows(merged) ? "persisted" : "offline");
        }
      } finally {
        if (inFlightRef.current === tick) inFlightRef.current = null;
      }
    },
    [settings, authToken]
  );

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    const { engine } = settings;
    const ms = Math.max(3, Number(engine.pollIntervalSec) || 15) * 1000;
    const id = window.setInterval(() => refresh({ silent: true }), ms);
    return () => window.clearInterval(id);
  }, [settings, refresh]);

  const submitFeedback = React.useCallback(
    async (payload) => {
      if (settings.engine.demoMode) {
        return { ok: true, demo: true };
      }
      return detectionApi.submitFeedback(
        settings.engine.baseUrl,
        payload,
        settings.engine.requestTimeoutMs
      );
    },
    [settings]
  );

  const value = React.useMemo(
    () => ({
      status,
      health,
      data,
      error,
      lastUpdated,
      refresh,
      submitFeedback,
      isDemo: status === "demo",
      isConnected: status === "connected" || status === "demo" || status === "persisted",
      isOffline: status === "offline",
      isDegraded: status === "degraded",
      isLoading: status === "loading",
    }),
    [status, health, data, error, lastUpdated, refresh, submitFeedback]
  );

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine() {
  return React.useContext(EngineContext);
}
