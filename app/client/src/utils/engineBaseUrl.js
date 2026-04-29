/**
 * Default ICS learning / detection service (MITRE repo: `python -m learning.cli serve`).
 * See MITRE `config/learning.yml` → api.port (default 8090). Must not use 8000 — that
 * port is reserved for the AegisRec API when using ./start-dev.sh.
 */
export const DEFAULT_DETECTION_ENGINE_URL = "http://127.0.0.1:8090";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

function isBrowserSameHostnameAsPage(hostname) {
  if (typeof window === "undefined" || !window.location?.hostname) return false;
  const page = String(window.location.hostname).toLowerCase();
  const h = String(hostname).toLowerCase();
  return page !== "" && h === page;
}

function withHttpScheme(raw) {
  const s = String(raw).trim();
  if (!s) return s;
  return /^https?:\/\//i.test(s) ? s : `http://${s}`;
}

const isCraDevelopment =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

/**
 * Rewrites mistaken engine URLs that point at the AegisRec API (port 8000 in local dev).
 *
 * - Adds http:// when missing (so `127.0.0.1:8000` parses and can be rewritten).
 * - Treats 0.0.0.0 like other loopback-style hosts for :8000 (matches MITRE api.host in yml).
 * - In CRA development, any host on port 8000 is rewritten — 8000 is always AegisRec then.
 */
export function resolveDetectionEngineBaseUrl(baseUrl, fallback = DEFAULT_DETECTION_ENGINE_URL) {
  if (baseUrl == null || String(baseUrl).trim() === "") {
    return fallback;
  }
  const trimmed = String(baseUrl).trim().replace(/\/+$/, "");
  const toParse = withHttpScheme(trimmed);
  try {
    const u = new URL(toParse);
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    const host = u.hostname.toLowerCase();

    if (port === "8000") {
      if (LOOPBACK_HOSTS.has(host)) return fallback;
      if (isBrowserSameHostnameAsPage(u.hostname)) return fallback;
      if (isCraDevelopment) return fallback;
    }

    if (!u.pathname || u.pathname === "/") {
      return u.origin;
    }
    return `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return trimmed;
  }
}
