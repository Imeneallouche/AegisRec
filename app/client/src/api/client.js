/**
 * Minimal fetch wrapper used by every detection-engine call.
 *
 * - Normalises base URL (no trailing slash).
 * - Adds a configurable per-request timeout via AbortController.
 * - Throws a typed `EngineError` on transport / non-2xx responses so callers
 *   can distinguish network failures (→ engine offline) from application
 *   errors (→ show inline message, keep polling).
 */

export class EngineError extends Error {
  constructor(message, { kind = "network", status, cause } = {}) {
    super(message);
    this.name = "EngineError";
    this.kind = kind;       // "network" | "timeout" | "http" | "parse"
    this.status = status;
    if (cause) this.cause = cause;
  }
}

function normaliseBase(baseUrl) {
  if (!baseUrl) return "";
  return String(baseUrl).trim().replace(/\/+$/, "");
}

export async function request(baseUrl, path, opts = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    timeoutMs = 8000,
    signal: externalSignal,
  } = opts;

  const url = `${normaliseBase(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort("timeout"), timeoutMs);
  const onExternalAbort = () => ctrl.abort("external");
  if (externalSignal) externalSignal.addEventListener("abort", onExternalAbort);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body != null ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (err) {
    if (ctrl.signal.aborted) {
      throw new EngineError(`Request to ${url} aborted`, {
        kind: ctrl.signal.reason === "timeout" ? "timeout" : "network",
        cause: err,
      });
    }
    throw new EngineError(`Network error reaching ${url}: ${err.message}`, {
      kind: "network",
      cause: err,
    });
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
  }

  if (!res.ok) {
    let text;
    try {
      text = await res.text();
    } catch {
      text = res.statusText;
    }
    throw new EngineError(`HTTP ${res.status} on ${method} ${path}: ${text || res.statusText}`, {
      kind: "http",
      status: res.status,
    });
  }

  try {
    return await res.json();
  } catch (err) {
    throw new EngineError(`Invalid JSON on ${method} ${path}`, { kind: "parse", cause: err });
  }
}
