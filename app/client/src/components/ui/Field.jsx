import React from "react";

/**
 * Lightweight form primitives that match the existing AegisRec visual language.
 * Purposely opinion-free (no form library) so they can be used in Settings,
 * feedback dialogs and anywhere else.
 */

export function Field({ label, description, htmlFor, children, error }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {description ? (
        <span className="text-xs leading-relaxed text-slate-500">{description}</span>
      ) : null}
      {children}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

export function TextInput({ id, value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input
      id={id}
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      {...rest}
    />
  );
}

export function NumberInput({ id, value, onChange, min, max, step = 1, suffix, ...rest }) {
  return (
    <div className="flex items-stretch gap-2">
      <input
        id={id}
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const n = e.target.value === "" ? "" : Number(e.target.value);
          onChange(n);
        }}
        min={min}
        max={max}
        step={step}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        {...rest}
      />
      {suffix ? (
        <span className="flex shrink-0 items-center rounded-lg bg-slate-50 px-3 text-xs font-medium text-slate-500 ring-1 ring-slate-200/70">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function SelectInput({ id, value, onChange, options, ...rest }) {
  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      {...rest}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function SliderInput({ id, value, onChange, min = 0, max = 1, step = 0.01, suffix = "" }) {
  return (
    <div className="flex items-center gap-4">
      <input
        id={id}
        type="range"
        value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-100 accent-indigo-600"
      />
      <span className="w-24 shrink-0 rounded-md bg-slate-50 px-3 py-1 text-right font-mono text-xs text-slate-700 ring-1 ring-slate-200/70">
        {typeof value === "number" ? value.toFixed(2) : "—"}{suffix ? ` ${suffix}` : ""}
      </span>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      onClick={() => onChange(!checked)}
      className={[
        "group flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm transition hover:border-indigo-100 hover:bg-indigo-50/30",
      ].join(" ")}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span>
        ) : null}
      </span>
      <span
        className={[
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition",
          checked ? "bg-indigo-600" : "bg-slate-200",
        ].join(" ")}
      >
        <span
          className={[
            "absolute h-5 w-5 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-5" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

export function SettingsGroup({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-100/60 sm:p-8">
      <header className="mb-6 flex items-start gap-4">
        {Icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/60">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
