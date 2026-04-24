import React from "react";

import { detectionApi } from "../api/detectionApi";
import { EngineError } from "../api/client";
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

function coerceSnapshot(raw) {
  if (!raw || typeof raw !== "object") return EMPTY_SNAPSHOT;
  return {
    chains: Array.isArray(raw.chains) ? raw.chains : [],
    alerts: Array.isArray(raw.alerts) ? raw.alerts : [],
    logs: Array.isArray(raw.logs) ? raw.logs : [],
    mitigations: Array.isArray(raw.mitigations) ? raw.mitigations : [],
    stats: raw.stats ?? null,
    fetchedAt: raw.fetched_at || raw.fetchedAt || new Date().toISOString(),
  };
}

export function EngineProvider({ children }) {
  const { settings } = useSettings();

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
          const snap = await loadDemoSnapshot();
          setData(snap);
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

      if (inFlightRef.current) return; // coalesce overlapping ticks
      if (!silent) setStatus((s) => (s === "idle" ? "loading" : s));

      const token = Symbol("refresh");
      inFlightRef.current = token;

      try {
        const h = await detectionApi.health(engine.baseUrl, engine.requestTimeoutMs);
        if (inFlightRef.current !== token) return;
        setHealth(h);

        try {
          const snap = await detectionApi.snapshot(engine.baseUrl, engine.requestTimeoutMs);
          if (inFlightRef.current !== token) return;
          setData(coerceSnapshot(snap));
          setError(null);
          setLastUpdated(new Date());
          setStatus("connected");
        } catch (snapErr) {
          if (inFlightRef.current !== token) return;
          // Engine is alive but cannot produce a snapshot.
          setData(EMPTY_SNAPSHOT);
          setError(snapErr instanceof EngineError ? snapErr.message : String(snapErr));
          setLastUpdated(new Date());
          setStatus("degraded");
        }
      } catch (err) {
        if (inFlightRef.current !== token) return;
        setHealth(null);
        setData(EMPTY_SNAPSHOT);
        setError(err instanceof EngineError ? err.message : String(err));
        setStatus("offline");
      } finally {
        if (inFlightRef.current === token) inFlightRef.current = null;
      }
    },
    [settings]
  );

  // Kick off on mount and whenever the config that affects fetching changes.
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Polling loop.
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
      isConnected: status === "connected" || status === "demo",
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
