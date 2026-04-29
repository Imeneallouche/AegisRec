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

export function apiBaseUrl() {
  const raw = process.env.REACT_APP_API_URL;
  if (raw != null && String(raw).trim() !== "") {
    return String(raw).trim().replace(/\/+$/, "");
  }
  return "";
}

async function siteRequest(path, { token, method = "GET", body, timeoutMs = 15000 } = {}) {
  const base = apiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${p}`;

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
    throw new EngineError(`HTTP ${res.status}: ${text || res.statusText}`, {
      kind: "http",
      status: res.status,
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

  patchMitigationApplied(token, persistedRecordId, applied) {
    return siteRequest(`/api/site/mitigations/${persistedRecordId}`, {
      token,
      method: "PATCH",
      body: { applied },
      timeoutMs: 10000,
    });
  },

  assistantChat(token, message) {
    return siteRequest(`/api/assistant/chat`, {
      token,
      method: "POST",
      body: { message },
      timeoutMs: 30000,
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
