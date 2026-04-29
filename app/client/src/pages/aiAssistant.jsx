import React from "react";
import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import Sidebar from "../components/sidebar";
import AIAssistantChat from "../components/ai/AIAssistantChat";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { IconNavAssistant } from "../data/icons";
import { useAuth } from "../context/AuthContext";
import { siteApi } from "../api/siteApi";
import { EngineError } from "../api/client";

function newId() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const WELCOME_ID = "welcome";

function welcomeMessages() {
  const welcome =
    "Hi — I'm your ICS security assistant. Ask questions about your asset register, attack chains, mitigations, and alerts. " +
    "Discussions are saved per site; pick a past thread or start a new one. Answers use your site's data in AegisRec plus this conversation's history.";
  return [
    {
      id: WELCOME_ID,
      role: "assistant",
      content: welcome,
      at: Date.now(),
    },
  ];
}

function mapServerMessage(m) {
  return {
    id: `db-${m.id}`,
    role: m.role,
    content: m.content,
    at: new Date(m.created_at).getTime(),
  };
}

function conversationDisplayTitle(c) {
  const t = (c?.title || "").trim();
  if (t) return t;
  return `Conversation #${c.id}`;
}

export default function AIAssistant() {
  const { token, site, authReady } = useAuth();
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [activeConversationId, setActiveConversationId] = React.useState(null);
  const [messages, setMessages] = React.useState(welcomeMessages);
  const [conversations, setConversations] = React.useState([]);
  const [loadingThreads, setLoadingThreads] = React.useState(false);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [threadsError, setThreadsError] = React.useState(null);

  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [editingConversationId, setEditingConversationId] = React.useState(null);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [renameSaving, setRenameSaving] = React.useState(false);
  const renameInputRef = React.useRef(null);

  const refreshThreads = React.useCallback(async () => {
    if (!token) {
      setConversations([]);
      return;
    }
    setThreadsError(null);
    setLoadingThreads(true);
    try {
      const rows = await siteApi.listAssistantConversations(token);
      setConversations(Array.isArray(rows) ? rows : []);
    } catch (err) {
      const msg =
        err instanceof EngineError ? err.message : err instanceof Error ? err.message : String(err);
      setThreadsError(msg);
    } finally {
      setLoadingThreads(false);
    }
  }, [token]);

  React.useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  React.useEffect(() => {
    if (editingConversationId == null) return undefined;
    const t = window.setTimeout(() => renameInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [editingConversationId]);

  const startNewChat = React.useCallback(() => {
    setActiveConversationId(null);
    setMessages(welcomeMessages());
    setInput("");
    setEditingConversationId(null);
    setRenameDraft("");
  }, []);

  const selectConversation = React.useCallback(
    async (id) => {
      if (!token || id == null) return;
      setEditingConversationId(null);
      setRenameDraft("");
      setLoadingMessages(true);
      setThreadsError(null);
      try {
        const res = await siteApi.getAssistantConversationMessages(token, id);
        setActiveConversationId(res.conversation_id);
        const mapped = (res.messages || []).map(mapServerMessage);
        setMessages(mapped.length ? mapped : welcomeMessages());
      } catch (err) {
        const msg =
          err instanceof EngineError ? err.message : err instanceof Error ? err.message : String(err);
        setThreadsError(msg);
      } finally {
        setLoadingMessages(false);
      }
    },
    [token]
  );

  const send = React.useCallback(async () => {
    const text = String(input).trim();
    if (!text || isSending || !token) return;

    const tempId = newId();
    setMessages((m) => [...m, { id: tempId, role: "user", content: text, at: Date.now() }]);
    setInput("");
    setIsSending(true);

    try {
      const res = await siteApi.assistantChat(token, text, activeConversationId);
      setActiveConversationId(res.conversation_id);
      setMessages((m) => {
        const stripped = m.filter((x) => x.id !== tempId && x.id !== WELCOME_ID);
        return [...stripped, mapServerMessage(res.user_message), mapServerMessage(res.assistant_message)];
      });
      await refreshThreads();
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
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
  }, [input, isSending, token, activeConversationId, refreshThreads]);

  const confirmDeleteConversation = React.useCallback(async () => {
    const conv = deleteTarget;
    if (!conv || !token) {
      setDeleteTarget(null);
      return;
    }
    try {
      await siteApi.deleteAssistantConversation(token, conv.id);
      if (activeConversationId === conv.id) {
        startNewChat();
      }
      await refreshThreads();
    } catch (err) {
      const msg =
        err instanceof EngineError ? err.message : err instanceof Error ? err.message : String(err);
      setThreadsError(msg);
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, token, activeConversationId, refreshThreads, startNewChat]);

  const cancelRename = React.useCallback(() => {
    setEditingConversationId(null);
    setRenameDraft("");
  }, []);

  const startRename = React.useCallback((c) => {
    setThreadsError(null);
    setEditingConversationId(c.id);
    setRenameDraft(conversationDisplayTitle(c));
  }, []);

  const submitRename = React.useCallback(
    async (e) => {
      e?.preventDefault?.();
      const id = editingConversationId;
      const trimmed = String(renameDraft).trim();
      if (id == null || !trimmed || !token || renameSaving) return;
      setRenameSaving(true);
      setThreadsError(null);
      try {
        await siteApi.patchAssistantConversationTitle(token, id, trimmed);
        await refreshThreads();
        setEditingConversationId(null);
        setRenameDraft("");
      } catch (err) {
        const msg =
          err instanceof EngineError ? err.message : err instanceof Error ? err.message : String(err);
        setThreadsError(msg);
      } finally {
        setRenameSaving(false);
      }
    },
    [editingConversationId, renameDraft, token, renameSaving, refreshThreads]
  );

  const siteLabel = site?.site_name || site?.username || "—";
  const activeConversationMeta = conversations.find((x) => x.id === activeConversationId);
  const panelTitle =
    activeConversationId != null
      ? conversationDisplayTitle(activeConversationMeta || { id: activeConversationId, title: null })
      : "New conversation";

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
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI assistant</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Context-aware answers using your ICS/OT site data and saved discussion history
                  {authReady ? "" : " (loading…)"}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:shrink-0">
              <span className="hidden max-w-[12rem] truncate text-sm text-slate-600 md:inline" title={siteLabel}>
                {siteLabel}
              </span>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100">
                DB-backed + history
              </span>
            </div>
          </header>

          <div className="flex min-h-0 min-w-0 flex-1 gap-3 lg:gap-4">
            <aside className="flex w-full max-w-[min(100%,18rem)] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100/80 lg:max-w-xs">
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 p-3">
                <button
                  type="button"
                  onClick={startNewChat}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-semibold text-indigo-800 shadow-sm transition hover:bg-indigo-100"
                >
                  <MessageSquarePlus className="h-4 w-4 shrink-0" aria-hidden />
                  New conversation
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-gutter:stable]">
                <p className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
                  History
                </p>
                {threadsError ? (
                  <p className="px-2 py-2 text-xs text-rose-600">{threadsError}</p>
                ) : null}
                {loadingThreads && !conversations.length ? (
                  <p className="px-2 py-3 text-xs text-slate-500">Loading conversations…</p>
                ) : null}
                {!loadingThreads && !conversations.length && !threadsError ? (
                  <p className="px-2 py-3 text-xs text-slate-500">No saved threads yet. Send a message to start one.</p>
                ) : null}
                <ul className="space-y-1">
                  {conversations.map((c) => {
                    const active = activeConversationId === c.id;
                    const label = conversationDisplayTitle(c);
                    const subtitle = c.message_count != null ? `${c.message_count} messages` : "";
                    const isEditing = editingConversationId === c.id;
                    return (
                      <li key={c.id} className="group rounded-lg border border-transparent hover:border-slate-100">
                        {isEditing ? (
                          <form
                            className="flex flex-col gap-2 p-1.5"
                            onSubmit={submitRename}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label htmlFor={`rename-conv-${c.id}`} className="sr-only">
                              Conversation title
                            </label>
                            <input
                              ref={renameInputRef}
                              id={`rename-conv-${c.id}`}
                              type="text"
                              value={renameDraft}
                              maxLength={512}
                              disabled={renameSaving}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelRename();
                                }
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
                              placeholder="Conversation title"
                              autoComplete="off"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={cancelRename}
                                disabled={renameSaving}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={renameSaving || !String(renameDraft).trim()}
                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {renameSaving ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-stretch gap-0.5">
                            <button
                              type="button"
                              onClick={() => selectConversation(c.id)}
                              className={[
                                "min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm transition",
                                active
                                  ? "bg-indigo-100 font-semibold text-indigo-900 ring-1 ring-indigo-200/80"
                                  : "text-slate-700 hover:bg-slate-100",
                              ].join(" ")}
                            >
                              <span className="line-clamp-2">{label}</span>
                              {subtitle ? (
                                <span className="mt-0.5 block text-[0.65rem] font-normal text-slate-500">
                                  {subtitle}
                                </span>
                              ) : null}
                            </button>
                            <button
                              type="button"
                              title="Rename conversation"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                startRename(c);
                              }}
                              className="flex w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-80 transition hover:bg-slate-100 hover:text-indigo-600 group-hover:opacity-100"
                              aria-label={`Rename ${label}`}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              title="Delete conversation"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeleteTarget(c);
                              }}
                              className="flex w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-80 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                              aria-label={`Delete conversation ${c.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100/80">
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-2.5 sm:px-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Conversation</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800" title={panelTitle}>
                  {panelTitle}
                </p>
                {loadingMessages ? (
                  <p className="mt-1 text-xs text-slate-500">Loading messages…</p>
                ) : null}
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
                      ? "Each send is stored (user + assistant) with a timestamp. Replies include site context: register, chains, alerts, mitigations, and prior turns in this thread."
                      : "Sign in to query your site's database context."
                  }
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete conversation?"
        message={
          deleteTarget
            ? `Permanently delete “${conversationDisplayTitle(deleteTarget)}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteConversation}
      />
    </div>
  );
}
