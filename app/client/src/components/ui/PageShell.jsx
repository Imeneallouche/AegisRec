import Sidebar from "../sidebar";

/**
 * Shared page chrome: sidebar + header + content area.
 * Keeps every top-level page visually consistent.
 */
export default function PageShell({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  contentClassName = "",
  fullHeight = false,
}) {
  return (
    <div
      className={
        fullHeight
          ? "h-screen bg-slate-50 text-slate-800"
          : "min-h-screen bg-slate-50 text-slate-800"
      }
    >
      <div className={fullHeight ? "flex h-full min-h-0" : "flex"}>
        <Sidebar />
        <main
          className={
            fullHeight
              ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:p-8"
              : "flex-1 p-4 sm:p-6 lg:p-8"
          }
        >
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {Icon ? (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200/60"
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </div>
              ) : null}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3 sm:shrink-0">
              {actions}
              <span className="hidden text-sm text-slate-500 md:inline">
                Log out
              </span>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
              >
                GRFICSv3
              </button>
            </div>
          </header>

          <div className={contentClassName || (fullHeight ? "flex min-h-0 flex-1 flex-col" : "")}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
