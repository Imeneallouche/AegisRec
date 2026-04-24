import React from "react";

/**
 * Single chat turn — user (right-ish / slate) vs assistant (indigo / left).
 */
export default function ChatMessageBubble({ role, content, timeLabel }) {
  const isUser = role === "user";
  return (
    <div
      className={`flex w-full min-w-0 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={[
          "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "rounded-tr-md bg-slate-800 text-slate-50"
            : "rounded-tl-md border border-indigo-100/80 bg-indigo-50/80 text-slate-800",
        ].join(" ")}
      >
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {content}
        </p>
        {timeLabel ? (
          <p
            className={[
              "mt-2 text-[0.65rem] font-medium",
              isUser ? "text-slate-400" : "text-indigo-400/90",
            ].join(" ")}
          >
            {timeLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
