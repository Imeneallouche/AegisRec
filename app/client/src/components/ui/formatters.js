/**
 * Small, dependency-free formatters reused across detection pages.
 */

export function formatDateTime(ts) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(ts);
  }
}

export function formatRelative(ts) {
  if (!ts) return "—";
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return String(ts);
  const diff = Date.now() - d;
  const abs = Math.abs(diff);
  const s = Math.round(abs / 1000);
  if (s < 60) return diff < 0 ? `in ${s}s` : `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return diff < 0 ? `in ${m}m` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return diff < 0 ? `in ${h}h` : `${h}h ago`;
  const days = Math.round(h / 24);
  return diff < 0 ? `in ${days}d` : `${days}d ago`;
}

export function formatTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(ts);
  }
}

export function formatPct(v, digits = 0) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${(Number(v) * 100).toFixed(digits)}%`;
}
