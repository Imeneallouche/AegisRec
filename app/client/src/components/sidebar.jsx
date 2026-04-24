import { NavLink } from "react-router-dom";
import {
  IconNavAssistant,
  IconNavBell,
  IconNavBook,
  IconNavDashboard,
  IconNavLogs,
  IconNavNetwork,
  IconNavSettings,
  IconNavShield,
  IconNavTable,
  IconNavTtp,
} from "../data/icons";

/** Grouped primary navigation; active item follows the current route (NavLink). */
const NAV_SECTIONS = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { to: "/Dashboard", title: "Dashboard", icon: IconNavDashboard, end: true },
    ],
  },
  {
    id: "assets",
    label: "Assets & inventory",
    items: [
      { to: "/AssetRegister", title: "Asset Register", icon: IconNavTable },
      { to: "/AssetInventory", title: "Asset Inventory", icon: IconNavNetwork },
    ],
  },
  {
    id: "security",
    label: "Threat & response",
    items: [
      { to: "/TTPs", title: "Attack Chains", icon: IconNavTtp },
      { to: "/Mitigations", title: "Mitigations", icon: IconNavShield },
      { to: "/Alerts", title: "Alerts", icon: IconNavBell },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { to: "/Monitoring", title: "Log monitoring", icon: IconNavLogs },
    ],
  },
  {
    id: "assistance",
    label: "Assistance",
    items: [
      { to: "/AIAssistant", title: "AI assistant", icon: IconNavAssistant },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { to: "/Documentation", title: "Documentation", icon: IconNavBook },
      { to: "/Settings", title: "Settings", icon: IconNavSettings },
    ],
  },
];

function navItemClassName({ isActive }) {
  return [
    "group flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium leading-snug transition-all duration-150",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
    isActive
      ? "bg-indigo-50 text-indigo-800 shadow-sm ring-1 ring-indigo-100/80"
      : "text-slate-600 hover:bg-slate-50/90 hover:text-slate-900",
  ].join(" ");
}

function navIconClassName(isActive) {
  return [
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
    isActive
      ? "border-indigo-200/80 bg-white text-indigo-600"
      : "border-slate-200/60 bg-slate-50/80 text-slate-500 group-hover:border-slate-200 group-hover:text-slate-600",
  ].join(" ");
}

/**
 * The sidebar renders inside a `sticky top-0` wrapper so it stays pinned to the
 * viewport while the main content area scrolls.  `h-screen` locks its height
 * to the viewport so the inner `overflow-y-auto` nav handles its own scroll.
 */
export default function Sidebar() {
  return (
    <aside
      className="sticky top-0 flex h-screen w-[min(18rem,100%)] flex-shrink-0 flex-col self-start border-r border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/40 shadow-[1px_0_0_0_rgba(15,23,42,0.04)]"
      aria-label="Main navigation"
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 py-5 sm:px-5 sm:py-6">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-3 px-1 sm:mb-7">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-base font-bold text-white shadow-sm ring-1 ring-indigo-600/20"
            aria-hidden
          >
            A
          </div>
          <div className="min-w-0">
            <div className="truncate text-[0.95rem] font-semibold leading-tight tracking-tight text-slate-900">
              AegisRec
            </div>
            <div className="text-xs font-medium text-slate-500">ICS / OT analyst portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden overscroll-y-contain pb-2 [-ms-overflow-style:none] [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200/80"
          aria-label="Application sections"
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.id}>
              <p className="mb-2 px-2 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400">
                {section.label}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={navItemClassName}
                      >
                        {({ isActive }) => (
                          <>
                            <span className={navIconClassName(isActive)} aria-hidden>
                              <Icon className="h-[1.1rem] w-[1.1rem]" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-left sm:whitespace-normal">
                              {item.title}
                            </span>
                            {isActive && (
                              <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 sm:inline" aria-hidden />
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Help */}
        <div className="mt-5 shrink-0 border-t border-slate-200/80 pt-5">
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/90 p-4 shadow-sm ring-1 ring-slate-100/50">
            <p className="text-sm font-semibold text-slate-800">Need help?</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Read the operator guide or contact support.
            </p>
            <NavLink
              to="/Documentation"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              <IconNavBook className="h-4 w-4" />
              Documentation
            </NavLink>
          </div>
        </div>
      </div>
    </aside>
  );
}
