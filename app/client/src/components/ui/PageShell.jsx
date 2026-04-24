import Sidebar from "../sidebar";
import ConnectionPill from "./ConnectionPill";

/**
 * Shared page chrome: sticky sidebar + scrollable main area.
 *
 * Layout contract:
 *   - The outer container is `min-h-screen` so short pages still fill the
 *     viewport.
 *   - The sidebar component uses `sticky top-0 h-screen`, so it stays visible
 *     while only the main content scrolls.
 *   - `fullHeight` is intended for pages that need their own inner scroll
 *     container (e.g. Log monitoring, AI assistant): we lock the viewport to
 *     `h-screen` and let the main area manage overflow internally.
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
      className={[
        "bg-slate-50 text-slate-800",
        fullHeight ? "h-screen overflow-hidden" : "min-h-screen",
      ].join(" ")}
    >
      <div className={fullHeight ? "flex h-full min-h-0" : "flex min-h-screen"}>
        <Sidebar />
        <main
          className={[
            "flex min-w-0 flex-1 flex-col",
            fullHeight
              ? "min-h-0 overflow-hidden p-6 sm:p-8 lg:p-10"
              : "p-6 sm:p-8 lg:p-10",
          ].join(" ")}
        >
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              {Icon ? (
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200/60"
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </div>
              ) : null}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem]">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1.5 max-w-3xl text-sm leading-7 text-slate-500">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
              {actions}
              <ConnectionPill />
            </div>
          </header>

          <div
            className={
              contentClassName ||
              (fullHeight ? "flex min-h-0 flex-1 flex-col gap-6" : "flex flex-col gap-6")
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
