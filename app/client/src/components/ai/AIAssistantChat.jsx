import React from "react";
import ChatMessageBubble from "./ChatMessageBubble";

function timeFormatter(ts) {
  try {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Scrollable thread + composer. Parent owns no API — callbacks only.
 */
export default function AIAssistantChat({
  messages,
  inputValue,
  onInputChange,
  onSend,
  isSending = false,
  disabled = false,
  placeholder = "Ask about your ICS environment, TTPs, or mitigations…",
  footNote,
}) {
  const bottomRef = React.useRef(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && !disabled && String(inputValue).trim()) onSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1 py-2 [scrollbar-gutter:stable] sm:px-2"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            Start a conversation below.
          </p>
        ) : null}
        {messages.map((m) => (
          <ChatMessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            timeLabel={timeFormatter(m.at)}
          />
        ))}
        <div ref={bottomRef} className="h-px w-full shrink-0" aria-hidden />
      </div>

      <div className="shrink-0 border-t border-slate-200/90 bg-slate-50/80 pt-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label htmlFor="ai-assistant-input" className="sr-only">
            Message
          </label>
          <textarea
            id="ai-assistant-input"
            rows={1}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className="min-h-[2.75rem] max-h-36 min-w-0 flex-1 resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Message to AI assistant"
          />
          <button
            type="button"
            onClick={() => onSend()}
            disabled={disabled || isSending || !String(inputValue).trim()}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:mb-0"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {footNote ||
            "AI responses are simulated in this build. Connect your backend to enable live assistance."}
        </p>
      </div>
    </div>
  );
}
