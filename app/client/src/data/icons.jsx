import React from "react";

/* ── Shared: default sizing for inline icons (Tailwind) ─────────────────── */
const DEFAULT_NAV = "w-5 h-5 shrink-0";
const DEFAULT_MISC = "w-6 h-6";

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children - path element(s)
 */
function SvgFrame({ className, children, title, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Sidebar / navigation (semantic names — use only these in Sidebar)
   ══════════════════════════════════════════════════════════════════════════ */

/** Home / main dashboard */
export const IconNavDashboard = ({ className = DEFAULT_NAV }) => (
  <SvgFrame className={className} title="Dashboard">
    <rect x="3" y="3" width="7" height="7" rx="1.2" />
    <rect x="14" y="3" width="7" height="7" rx="1.2" />
    <rect x="3" y="14" width="7" height="7" rx="1.2" />
    <rect x="14" y="14" width="7" height="7" rx="1.2" />
  </SvgFrame>
);

/** Tabular asset register / spreadsheet-like data */
export const IconNavTable = ({ className = DEFAULT_NAV }) => (
  <SvgFrame className={className} title="Register">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M3 14h18M9 4v16M15 4v16" />
  </SvgFrame>
);

/** Network / topology (asset inventory, architecture) */
export const IconNavNetwork = ({ className = DEFAULT_NAV }) => (
  <SvgFrame className={className} title="Network">
    <circle cx="12" cy="5" r="2.2" />
    <circle cx="5" cy="19" r="2.2" />
    <circle cx="19" cy="19" r="2.2" />
    <path d="M10.2 6.5L6.2 16.2M12 6.5l5.5 11M19 16.2l-4.5-9.7" />
  </SvgFrame>
);

/** Tactics / TTPs — target / crosshair */
export const IconNavTtp = ({ className = DEFAULT_NAV }) => (
  <SvgFrame className={className} title="TTPs">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    <circle cx="12" cy="12" r="2.5" />
  </SvgFrame>
);

/** Mitigations — shield */
export const IconNavShield = ({ className = DEFAULT_NAV }) => (
  <SvgFrame className={className} title="Mitigations">
    <path d="M12 3.5L5 6.2v4.1c0 4.4 2.6 8.3 6.5 9.7 3.9-1.4 6.5-5.3 6.5-9.7V6.2L12 3.5z" />
    <path d="M9.5 12.5l2 2L15 9.5" />
  </SvgFrame>
);

/** Alerts / notifications */
export const IconNavBell = ({ className = DEFAULT_NAV }) => (
  <SvgFrame className={className} title="Alerts">
    <path d="M12 3a5.5 5.5 0 00-5.5 5.5V14l-1.2 2.2h16.4L17.5 14v-5.5A5.5 5.5 0 0012 3z" />
    <path d="M9 18h6a1.5 1.5 0 11-3 0" />
  </SvgFrame>
);

/** Log & monitoring — file with lines */
export const IconNavLogs = ({ className = DEFAULT_NAV }) => (
  <SvgFrame className={className} title="Log monitoring">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z" />
    <path d="M14 2v5h5M8 10h8M8 14h6M8 18h4" />
  </SvgFrame>
);

/** Settings / configuration (cog) */
export const IconNavSettings = ({ className = DEFAULT_NAV }) => (
  <SvgFrame className={className} title="Settings">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </SvgFrame>
);

/** Help / documentation (sidebar footer) */
export const IconNavBook = ({ className = DEFAULT_NAV }) => (
  <SvgFrame className={className} title="Documentation">
    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5Z" />
    <path d="M4 4.5A2.5 2.5 0 0 0 6.5 2H20" />
  </SvgFrame>
);

/** AI assistant — chat bubble with lines + sparkle accent */
export const IconNavAssistant = ({ className = DEFAULT_NAV }) => (
  <SvgFrame className={className} title="AI Assistant">
    <path d="M5 3h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H9l-2.5 3V12H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M7 6.5h3M7 8.5h2" />
    <path d="M18.5 2.5L19 4M19 4h1.5M19 4l-1-1" />
  </SvgFrame>
);

/* ══════════════════════════════════════════════════════════════════════════
   Legacy / dashboard metric icons (kept for dashboard.jsx & older screens)
   ══════════════════════════════════════════════════════════════════════════ */

export const IconEye = () => (
  <svg
    className={`${DEFAULT_MISC} text-slate-400`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.269 2.943 9.542 7-1.273 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

export const IconPointer = () => (
  <svg
    className={`${DEFAULT_MISC} text-slate-400`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 7l10 10M7 17V7h10"
    />
  </svg>
);

export const IconStar = () => (
  <svg
    className={`${DEFAULT_MISC} text-slate-400`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 17.3l6.18 3.73-1.64-7.03L21 9.24l-7.19-.61L12 2 10.19 8.63 3 9.24l4.46 4.76L5.82 21z"
    />
  </svg>
);

export const IconTrend = () => (
  <svg
    className={`${DEFAULT_MISC} text-slate-400`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 3v18h18"
    />
    <path
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 6l-6 6-4-4-5 5"
    />
  </svg>
);

/** @deprecated Prefer IconNavDashboard — alias kept for compatibility */
export const IconDashboard = IconNavDashboard;

export const IconInfo = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4m0 4h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z"
    />
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   Aggregate export (optional default import)
   ══════════════════════════════════════════════════════════════════════════ */

const Icons = {
  IconNavDashboard,
  IconNavTable,
  IconNavNetwork,
  IconNavTtp,
  IconNavShield,
  IconNavBell,
  IconNavLogs,
  IconNavSettings,
  IconNavBook,
  IconNavAssistant,
  IconEye,
  IconPointer,
  IconStar,
  IconTrend,
  IconDashboard,
  IconInfo,
};

export default Icons;
