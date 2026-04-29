import React from "react";
import Sidebar from "../components/sidebar";
import RegisterSheetTabs from "../components/RegisterSheetTabs";
import { useAuth } from "../context/AuthContext";

export default function AssetRegister() {
  const { assetRegister, authReady, refreshAssetRegister } = useAuth();
  const register = assetRegister;

  React.useEffect(() => {
    if (authReady) {
      refreshAssetRegister();
    }
  }, [authReady, refreshAssetRegister]);

  if (!authReady || !register) {
    return (
      <div className="flex h-screen bg-slate-50 text-slate-800">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" aria-hidden />
            <p className="text-sm text-slate-600">
              {!authReady ? "Loading session…" : "Loading asset register from AegisRec…"}
            </p>
          </div>
        </main>
      </div>
    );
  }

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
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100">
                Database-backed
              </span>
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
                import: {register?.metadata?.normalization_date || new Date().toLocaleString()}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
