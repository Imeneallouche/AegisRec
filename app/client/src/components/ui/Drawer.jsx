import React from "react";

/**
 * Right-side slide-over drawer for detail views.
 * Open/close is fully controlled by the parent via `open`.
 */
export default function Drawer({ open, onClose, title, subtitle, children, widthClassName = "w-full sm:w-[44rem] lg:w-[52rem]" }) {
  React.useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      className={[
        "fixed inset-0 z-40 transition-opacity duration-200",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        className={[
          "absolute right-0 top-0 flex h-full min-h-0 flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-200",
          widthClassName,
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            aria-label="Close drawer"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
          {children}
        </div>
      </aside>
    </div>
  );
}

export function DrawerSection({ title, action, children }) {
  return (
    <section className="mb-6 last:mb-0">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DrawerField({ label, value, mono = false }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <span
        className={[
          "min-w-0 text-right text-sm text-slate-800",
          mono ? "font-mono [overflow-wrap:anywhere]" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
