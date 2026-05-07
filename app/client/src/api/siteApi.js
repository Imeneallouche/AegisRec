import { EngineError } from "./client";

const TOKEN_STORAGE_KEY = "aegisrec_access_token";

export function getStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function stripTrailingSlashes(s) {
  return String(s).replace(/\/+$/, "");
}

function withHttpScheme(raw) {
  const s = String(raw).trim();
  if (!s) return s;
  return /^https?:\/\//i.test(s) ? s : `http://${s}`;
}

/**
 * Base URL for the AegisRec site API (auth, persisted data, Elasticsearch proxy, assistant).
 * When empty, requests use same-origin paths like `/api/...` (CRA proxies `/api` to uvicorn).
 *
 * Use `REACT_APP_AEGISREC_API_URL` to override explicitly. `REACT_APP_API_URL` is still
 * supported, but must point at the AegisRec API (default dev port 8000), not the MITRE
 * learning service (8090) — otherwise every `/api/site/*` call returns HTTP 404.
 */
export function apiBaseUrl() {
  const explicit = process.env.REACT_APP_AEGISREC_API_URL;
  if (explicit != null && String(explicit).trim() !== "") {
    return stripTrailingSlashes(String(explicit).trim());
  }

  const raw = process.env.REACT_APP_API_URL;
  if (raw != null && String(raw).trim() !== "") {
    const trimmed = stripTrailingSlashes(String(raw).trim());
    try {
      const u = new URL(withHttpScheme(trimmed));
      if (u.port === "8090") {
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            "[AegisRec] REACT_APP_API_URL uses port 8090 (MITRE learning default). " +
              "That service has no /api/site/*. Using same-origin /api instead (CRA proxy → AegisRec on port 8000). " +
              "To force a remote AegisRec API, set REACT_APP_AEGISREC_API_URL."
          );
        }
        return "";
      }
    } catch {
      /* ignore URL parse; use trimmed base */
    }
    return trimmed;
  }
  return "";
}

/** Join base + path without `/api/api/` when env already ends with `/api`. */
export function buildSiteApiUrl(path) {
  const base = apiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  const b = stripTrailingSlashes(base);
  if (b.endsWith("/api") && p.startsWith("/api/")) {
    return `${b}${p.slice(4)}`;
  }
  return `${b}${p}`;
}

async function siteRequest(path, { token, method = "GET", body, timeoutMs = 15000 } = {}) {
  const url = buildSiteApiUrl(path);

  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort("timeout"), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        ...(body != null ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (ctrl.signal.aborted) {
      throw new EngineError(`Request to ${url} aborted`, {
        kind: ctrl.signal.reason === "timeout" ? "timeout" : "network",
        cause: err,
      });
    }
    throw new EngineError(`Network error: ${err.message}`, { kind: "network", cause: err });
  } finally {
    window.clearTimeout(timer);
  }

  if (!res.ok) {
    let text;
    try {
      text = await res.text();
    } catch {
      text = res.statusText;
    }
    let msg = `HTTP ${res.status}: ${text || res.statusText}`;
    if (res.status === 404) {
      const bodyLower = (text || "").toLowerCase();
      const looksLikeFastApiMissingRoute =
        bodyLower.includes("not found") && bodyLower.includes("detail");
      if (looksLikeFastApiMissingRoute) {
        msg +=
          " — This response is from a server that does not expose /api/site/* (typical when REACT_APP_API_URL points at the MITRE learning service on port 8090). " +
          `Request URL: ${url}. Use same-origin /api (unset REACT_APP_API_URL when using npm start + proxy), or set REACT_APP_AEGISREC_API_URL to the AegisRec API base (e.g. http://127.0.0.1:8000).`;
      } else {
        msg += ` Request URL: ${url}.`;
      }
    }
    throw new EngineError(msg, {
      kind: "http",
      status: res.status,
      requestUrl: url,
    });
  }

  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch (err) {
    throw new EngineError("Invalid JSON from AegisRec API", { kind: "parse", cause: err });
  }
}

export const siteApi = {
  login(username, password) {
    return siteRequest(`/api/auth/login`, {
      method: "POST",
      body: { username, password },
      timeoutMs: 12000,
    });
  },

  me(token) {
    return siteRequest(`/api/auth/me`, { token, timeoutMs: 8000 });
  },

  getAssetRegister(token) {
    return siteRequest(`/api/site/asset-register`, { token, timeoutMs: 20000 });
  },

  getPersistedSnapshot(token) {
    return siteRequest(`/api/site/persisted-snapshot`, { token, timeoutMs: 20000 });
  },

  syncDetectionIndices(token, payload = {}) {
    return siteRequest(`/api/site/sync-detection-indices`, {
      token,
      method: "POST",
      body: {
        alert_minutes: Math.max(5, Math.min(Number(payload.alert_minutes) || 2880, 10080)),
        chain_minutes: Math.max(5, Math.min(Number(payload.chain_minutes) || 2880, 10080)),
      },
      timeoutMs: 60000,
    });
  },

  getRecentLogs(token, minutes = 5) {
    const m = Math.max(1, Math.min(Number(minutes) || 5, 1440));
    return siteRequest(`/api/site/recent-logs?minutes=${encodeURIComponent(m)}`, {
      token,
      timeoutMs: 25000,
    });
  },

  getElasticsearchHealth(token) {
    return siteRequest(`/api/site/elasticsearch/health`, { token, timeoutMs: 12000 });
  },

  patchMitigationApplied(token, persistedRecordId, applied) {
    return siteRequest(`/api/site/mitigations/${persistedRecordId}`, {
      token,
      method: "PATCH",
      body: { applied },
      timeoutMs: 10000,
    });
  },

  assistantChat(token, message, conversationId = null) {
    return siteRequest(`/api/assistant/chat`, {
      token,
      method: "POST",
      body: {
        message,
        ...(conversationId != null ? { conversation_id: conversationId } : {}),
      },
      timeoutMs: 30000,
    });
  },

  listAssistantConversations(token) {
    return siteRequest(`/api/assistant/conversations`, { token, timeoutMs: 15000 });
  },

  getAssistantConversationMessages(token, conversationId) {
    return siteRequest(`/api/assistant/conversations/${conversationId}/messages`, {
      token,
      timeoutMs: 15000,
    });
  },

  deleteAssistantConversation(token, conversationId) {
    return siteRequest(`/api/assistant/conversations/${conversationId}`, {
      token,
      method: "DELETE",
      timeoutMs: 15000,
    });
  },

  patchAssistantConversationTitle(token, conversationId, title) {
    return siteRequest(`/api/assistant/conversations/${conversationId}`, {
      token,
      method: "PATCH",
      body: { title },
      timeoutMs: 15000,
    });
  },

  ingestAttackChain(token, payload) {
    return siteRequest(`/api/site/attack-chains`, {
      token,
      method: "POST",
      body: payload,
      timeoutMs: 15000,
    });
  },

  ingestAlert(token, payload) {
    return siteRequest(`/api/site/alerts`, {
      token,
      method: "POST",
      body: payload,
      timeoutMs: 15000,
    });
  },

  ingestMitigation(token, payload) {
    return siteRequest(`/api/site/mitigations`, {
      token,
      method: "POST",
      body: payload,
      timeoutMs: 15000,
    });
  },
};
