import React from "react";
import Sidebar from "../components/sidebar";
import RegisterSheetTabs from "../components/RegisterSheetTabs";
import assetRegister from "../data/assetRegister";

const initialRegister = { ...assetRegister };

export default function AssetRegister() {
  const [register] = React.useState(initialRegister);

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 flex flex-col p-6 sm:p-8 min-w-0 min-h-0 h-full max-h-full overflow-hidden">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Asset Register</h1>
              <p className="text-sm text-slate-500 mt-1">
                Structured ICS/OT assets, networks, and relationships — use the
                sheet tabs to browse each table.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-sm text-slate-500 hidden md:block">Log out</div>
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
              >
                GRFICSv3
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col min-h-0 bg-slate-100/50 rounded-xl border border-slate-200/80 p-4 sm:p-5 overflow-hidden">
            <RegisterSheetTabs register={register} />
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white/80 py-3 mt-4 -mx-6 sm:-mx-8 px-6 sm:px-8 -mb-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-xs sm:text-sm text-slate-500">
              <div>
                <span className="font-semibold text-slate-700">
                  {register?.metadata?.site_name}
                </span>
                <span className="text-slate-400 mx-2">•</span>
                <span>ICS Security Platform — Asset register</span>
              </div>
              <div className="text-slate-400 tabular-nums">
                Standard: {register?.metadata?.standard_version || "—"} · Last
                import: {new Date().toLocaleString()}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
