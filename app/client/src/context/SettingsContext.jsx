import React from "react";

const STORAGE_KEY = "aegisrec:settings:v1";

/**
 * Default configuration for the AegisRec client.  These values are safe for
 * local development (engine assumed to run at http://localhost:8000) and are
 * overridden per-user via localStorage.
 */
export const DEFAULT_SETTINGS = {
  engine: {
    baseUrl: "http://localhost:8000",
    pollIntervalSec: 15,
    requestTimeoutMs: 8000,
    demoMode: false,
  },
  layerA: {
    alertThreshold: 0.50,
    recallFloorEnabled: true,
  },
  layerC: {
    acceptSafetyThreshold: 0.85,
    ambiguityBandLow: 0.35,
    ambiguityBandHigh: 0.70,
  },
  layerD: {
    llmBackend: "mock",
    abstainOnEmptyRetrieval: true,
    requireHumanApproval: true,
  },
  notifications: {
    criticalAlerts: true,
    newChains: true,
    mitigationsProposed: true,
    emailDigest: false,
  },
  analyst: {
    displayName: "Security Analyst",
    timezone: "local",
    role: "tier-2",
  },
  appearance: {
    density: "comfortable",
  },
};

function deepMerge(base, override) {
  if (!override || typeof override !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    const b = base?.[key];
    const o = override[key];
    if (b && typeof b === "object" && !Array.isArray(b) && o && typeof o === "object" && !Array.isArray(o)) {
      out[key] = deepMerge(b, o);
    } else if (o !== undefined) {
      out[key] = o;
    }
  }
  return out;
}

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const SettingsContext = React.createContext({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = React.useState(() =>
    deepMerge(DEFAULT_SETTINGS, readStored() || {})
  );

  const updateSettings = React.useCallback((patch) => {
    setSettings((prev) => {
      const next = typeof patch === "function" ? patch(prev) : deepMerge(prev, patch);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* quota or private mode; ignore */
      }
      return next;
    });
  }, []);

  const resetSettings = React.useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = React.useMemo(
    () => ({ settings, updateSettings, resetSettings }),
    [settings, updateSettings, resetSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return React.useContext(SettingsContext);
}
