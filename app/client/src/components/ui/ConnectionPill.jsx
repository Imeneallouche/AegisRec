import React from "react";
import { RefreshCw, Wifi, WifiOff, AlertTriangle, FlaskConical } from "lucide-react";

import { useEngine } from "../../context/EngineContext";
import { formatRelative } from "./formatters";

/**
 * Small pill displayed in every page header so analysts always know whether
 * the UI is wired to the live engine, is in demo mode, or has lost contact.
 */
export default function ConnectionPill() {
  const { status, lastUpdated, refresh, isLoading } = useEngine();
  const [busy, setBusy] = React.useState(false);

  const onClick = async () => {
    if (busy || isLoading) return;
    setBusy(true);
    try {
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const styles = STATE[status] || STATE.idle;

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        lastUpdated
          ? `Last snapshot ${formatRelative(lastUpdated)}. Click to refresh now.`
          : "Click to refresh now."
      }
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm transition",
        styles.wrapper,
      ].join(" ")}
    >
      <span className="relative inline-flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${styles.ping}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${styles.dot}`} />
      </span>
      <styles.Icon className="h-3.5 w-3.5" />
      <span>{styles.label}</span>
      {lastUpdated && (status === "connected" || status === "demo") ? (
        <span className="hidden text-[0.65rem] text-slate-500 sm:inline">
          · {formatRelative(lastUpdated)}
        </span>
      ) : null}
      <RefreshCw className={`h-3 w-3 text-slate-400 ${busy || isLoading ? "animate-spin" : ""}`} />
    </button>
  );
}

const STATE = {
  connected: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    dot: "bg-emerald-500",
    ping: "bg-emerald-400",
    Icon: Wifi,
    label: "Engine live",
  },
  demo: {
    wrapper: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    dot: "bg-indigo-500",
    ping: "bg-indigo-400",
    Icon: FlaskConical,
    label: "Demo mode",
  },
  offline: {
    wrapper: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    dot: "bg-rose-500",
    ping: "bg-rose-400",
    Icon: WifiOff,
    label: "Engine offline",
  },
  degraded: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    dot: "bg-amber-500",
    ping: "bg-amber-400",
    Icon: AlertTriangle,
    label: "Engine degraded",
  },
  loading: {
    wrapper: "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
    dot: "bg-slate-400",
    ping: "bg-slate-300",
    Icon: RefreshCw,
    label: "Connecting…",
  },
  idle: {
    wrapper: "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
    dot: "bg-slate-400",
    ping: "bg-slate-300",
    Icon: RefreshCw,
    label: "Idle",
  },
};
