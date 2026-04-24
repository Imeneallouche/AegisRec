import React from "react";
import Sidebar from "../components/sidebar";
import AIAssistantChat from "../components/ai/AIAssistantChat";
import { IconNavAssistant } from "../data/icons";

const WELCOME_ID = "welcome";
const WELCOME_TEXT =
  "Hi — I’m your ICS security assistant. Ask questions about your asset register, TTPs, mitigations, or day-to-day triage. (Responses are placeholder until a model API is connected.)";

function newId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AIAssistant() {
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const replyTimerRef = React.useRef(null);
  const [messages, setMessages] = React.useState(() => [
    {
      id: WELCOME_ID,
      role: "assistant",
      content: WELCOME_TEXT,
      at: Date.now(),
    },
  ]);

  React.useEffect(
    () => () => {
      if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
    },
    []
  );

  const send = React.useCallback(() => {
    const text = String(input).trim();
    if (!text || isSending) return;

    const userMsg = { id: newId(), role: "user", content: text, at: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsSending(true);

    if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
    const delay = 500 + Math.min(400, text.length * 4);
    replyTimerRef.current = window.setTimeout(() => {
      replyTimerRef.current = null;
      setMessages((m) => [
        ...m,
        {
          id: newId(),
          role: "assistant",
          content: `I received: “${text.slice(0, 200)}${text.length > 200 ? "…" : ""}”\n\nThis is a demo response. Wire this page to your LLM or RAG service to return real analysis.`,
          at: Date.now(),
        },
      ]);
      setIsSending(false);
    }, delay);
  }, [input, isSending]);

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
                  Ask questions in natural language. Optimized for ICS / OT
                  security workflows.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:shrink-0">
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
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
