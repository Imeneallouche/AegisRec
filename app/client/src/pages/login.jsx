import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, Shield } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { EngineError } from "../api/client";

export default function Login() {
  const { token, authReady, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/Dashboard";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (authReady && token) {
      navigate(from, { replace: true });
    }
  }, [authReady, token, from, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const u = String(username).trim();
    const p = String(password);
    if (!u || !p) {
      setError("Enter username and password.");
      return;
    }
    setBusy(true);
    try {
      await login(u, p);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof EngineError && err.kind === "http") {
        setError("Invalid username or password.");
      } else if (err instanceof EngineError) {
        setError(`Cannot reach API: ${err.message}`);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.18), transparent 45%), radial-gradient(circle at 80% 30%, rgba(14,165,233,0.12), transparent 40%), radial-gradient(circle at 50% 100%, rgba(99,102,241,0.08), transparent 50%)",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-600/25 ring-1 ring-indigo-500/30">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AegisRec</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to your ICS / OT site workspace</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Secure site access</p>
              <p className="text-xs text-slate-500">Credentials are verified server-side; passwords are never stored in plain text.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-user" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Username
              </label>
              <input
                id="login-user"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                placeholder="e.g. grficsadmin"
              />
            </div>
            <div>
              <label htmlFor="login-pass" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Password
              </label>
              <input
                id="login-pass"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50/90 px-4 py-3 text-sm text-rose-800" role="alert">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
              ) : (
                <Lock className="h-4 w-4" aria-hidden />
              )}
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            <Link to="/Documentation" className="font-medium text-indigo-600 hover:text-indigo-700">
              Documentation
            </Link>
            <span className="mx-2 text-slate-300">·</span>
            Platform analyst portal
          </p>
        </div>
      </div>
    </div>
  );
}
