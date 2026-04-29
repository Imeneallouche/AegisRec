import React from "react";
import Sidebar from "../components/sidebar";
import AIAssistantChat from "../components/ai/AIAssistantChat";
import { IconNavAssistant } from "../data/icons";
import { useAuth } from "../context/AuthContext";
import { siteApi } from "../api/siteApi";
import { EngineError } from "../api/client";

function newId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const WELCOME_ID = "welcome";

export default function AIAssistant() {
  const { token, site, authReady } = useAuth();
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [messages, setMessages] = React.useState(() => {
    const welcome =
      "Hi — I'm your ICS security assistant. Ask questions about your asset register, attack chains, mitigations, and alerts. " +
      "Answers use your site's data stored in AegisRec (see the AI chat API for context).";
    return [
      {
        id: WELCOME_ID,
        role: "assistant",
        content: welcome,
        at: Date.now(),
      },
    ];
  });

  const send = React.useCallback(async () => {
    const text = String(input).trim();
    if (!text || isSending || !token) return;

    const userMsg = { id: newId(), role: "user", content: text, at: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const res = await siteApi.assistantChat(token, text);
      const replyText = typeof res?.reply === "string" ? res.reply : JSON.stringify(res);
      setMessages((m) => [
        ...m,
        {
          id: newId(),
          role: "assistant",
          content: replyText,
          at: Date.now(),
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof EngineError
          ? `Request failed: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      setMessages((m) => [
        ...m,
        {
          id: newId(),
          role: "assistant",
          content: msg,
          at: Date.now(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, token]);

  const siteLabel = site?.site_name || site?.username || "—";

  return (
    <div className="h-screen bg-slate-50 text-slate-800">
      <div className="flex h-full min-h-0">
        <Sidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 sm:p-6 lg:p-8">
          <header className="mb-4 flex shrink-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200/60"
                aria-hidden
              >
                <IconNavAssistant className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  AI assistant
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Context-aware answers using your ICS/OT site record in the database
                  {authReady ? "" : " (loading…)"}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:shrink-0">
              <span className="hidden max-w-[12rem] truncate text-sm text-slate-600 md:inline" title={siteLabel}>
                {siteLabel}
              </span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100">
                DB-backed context
              </span>
            </div>
          </header>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100/80">
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:px-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Conversation
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4 lg:p-5">
              <AIAssistantChat
                messages={messages}
                inputValue={input}
                onInputChange={setInput}
                onSend={send}
                isSending={isSending}
                disabled={!token}
                footNote={
                  token
                    ? "Responses combine live site context from AegisRec (asset register, detection history). Connect an LLM for richer narrative answers."
                    : "Sign in to query your site's database context."
                }
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
