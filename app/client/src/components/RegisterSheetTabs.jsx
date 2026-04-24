import React from "react";
import { TableProperties, Radio, Unplug, MapPin, Link2, Package, Shield, Share2 } from "lucide-react";
import RegisterDataTable from "./RegisterDataTable";
import RegisterMetadataPanel from "./RegisterMetadataPanel";

const SHEET_CONFIG = [
  {
    id: "metadata",
    label: "Overview",
    shortLabel: "Overview",
    icon: TableProperties,
    type: "metadata",
  },
  {
    id: "assets",
    label: "Assets",
    shortLabel: "Assets",
    icon: Radio,
    key: "assets",
  },
  {
    id: "network_interfaces",
    label: "Network interfaces",
    shortLabel: "Interfaces",
    icon: Unplug,
    key: "network_interfaces",
  },
  {
    id: "network_ranges",
    label: "Network ranges",
    shortLabel: "Ranges",
    icon: MapPin,
    key: "network_ranges",
  },
  {
    id: "connections",
    label: "Connections",
    shortLabel: "Links",
    icon: Link2,
    key: "connections",
  },
  {
    id: "software",
    label: "Software",
    shortLabel: "Software",
    icon: Package,
    key: "software",
  },
  {
    id: "security_zones",
    label: "Security zones",
    shortLabel: "Zones",
    icon: Shield,
    key: "security_zones",
  },
  {
    id: "protocols_used",
    label: "Protocols",
    shortLabel: "Protocols",
    icon: Share2,
    key: "protocols_used",
  },
];

/**
 * Excel-style sheet tabs + panel for the full asset register object.
 */
export default function RegisterSheetTabs({ register }) {
  const [activeId, setActiveId] = React.useState("metadata");
  const active =
    React.useMemo(
      () => SHEET_CONFIG.find((s) => s.id === activeId) || SHEET_CONFIG[0],
      [activeId]
    );

  const panel = React.useMemo(() => {
    if (!register) {
      return (
        <div className="text-sm text-slate-500 p-6">No register data.</div>
      );
    }
    if (active.type === "metadata") {
      return <RegisterMetadataPanel metadata={register.metadata} />;
    }
    const data = register[active.key];
    const isArray = Array.isArray(data);
    return (
      <RegisterDataTable
        rows={isArray ? data : []}
        emptyMessage={
          isArray
            ? "No records in this sheet."
            : "This section has no list data."
        }
      />
    );
  }, [register, active]);

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 w-full gap-0">
      {/* Tab bar — sheet-like, horizontal scroll on narrow screens */}
      <div
        className="flex items-stretch gap-0 -mb-px border-b border-slate-200 bg-slate-100/80 rounded-t-lg px-1 pt-1 overflow-x-auto scrollbar-thin"
        role="tablist"
        aria-label="Register sheets"
      >
        {SHEET_CONFIG.map((sheet) => {
          const Icon = sheet.icon;
          const isActive = sheet.id === activeId;
          return (
            <button
              key={sheet.id}
              type="button"
              role="tab"
              title={sheet.label}
              aria-selected={isActive}
              onClick={() => setActiveId(sheet.id)}
              className={`
                group flex items-center gap-2 shrink-0 px-3 py-2.5 text-sm font-medium border border-transparent rounded-t-md
                transition-all duration-150
                ${
                  isActive
                    ? "bg-white text-indigo-600 border-slate-200 border-b-white shadow-sm z-[1] -mb-px"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/60 border-transparent"
                }
              `}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-500" : "text-slate-400"}`}
                strokeWidth={2}
                aria-hidden
              />
              <span className="whitespace-nowrap hidden sm:inline">{sheet.label}</span>
              <span className="whitespace-nowrap sm:hidden">{sheet.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Sheet content — white “page”; inner area flexes so tables get a bounded height */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0 bg-white border border-slate-200 border-t-0 rounded-b-lg p-4 pt-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2 shrink-0">
          <h2 className="text-sm font-semibold text-slate-800">{active.label}</h2>
          {active.type !== "metadata" && Array.isArray(register?.[active.key]) && (
            <span className="text-xs text-slate-500 tabular-nums">
              {register[active.key].length} row
              {register[active.key].length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
          {panel}
        </div>
      </div>
    </div>
  );
}
