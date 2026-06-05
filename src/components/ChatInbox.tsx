"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import clsx from "clsx";
import type { LeadStatus, MessageDirection } from "@prisma/client";
import StatusBadge from "./StatusBadge";
import OwnerSelect, { type TeamUser } from "./OwnerSelect";
import NotesPanel from "./NotesPanel";
import { clockTime, initials, timeAgo } from "@/lib/format";

export type MessageDTO = {
  id: string;
  direction: MessageDirection;
  body: string;
  status: string;
  createdAt: string;
};

export type ConversationDTO = {
  id: string;
  channel: string;
  unreadCount: number;
  needsHuman?: boolean;
  lastMessageAt: string;
  lead: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    company: string | null;
    status: LeadStatus;
    tags: string[];
    ownerId: string | null;
  };
  messages: MessageDTO[];
};

export default function ChatInbox({
  conversations: initial,
  users,
  initialConversationId,
}: {
  conversations: ConversationDTO[];
  users: TeamUser[];
  initialConversationId?: string;
}) {
  const [conversations, setConversations] = useState(initial);
  const [activeId, setActiveId] = useState<string | undefined>(
    initialConversationId || initial[0]?.id
  );
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "attention">("all");
  const [channel, setChannel] = useState<"all" | "whatsapp" | "widget" | "website">("all");
  const [quickReplies, setQuickReplies] = useState<{ id: string; title: string; body: string }[]>([]);
  const [showQuick, setShowQuick] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "unread" && c.unreadCount === 0) return false;
      if (filter === "attention" && !c.needsHuman) return false;
      if (channel !== "all" && c.channel !== channel) return false;
      if (!q) return true;
      const digits = q.replace(/[^\d]/g, "");
      return (
        c.lead.name.toLowerCase().includes(q) ||
        (c.lead.company || "").toLowerCase().includes(q) ||
        (c.lead.email || "").toLowerCase().includes(q) ||
        (!!digits && (c.lead.phone || "").replace(/[^\d]/g, "").includes(digits)) ||
        c.messages.some((m) => m.body.toLowerCase().includes(q))
      );
    });
  }, [conversations, search, filter, channel]);

  const unreadTotal = useMemo(() => conversations.filter((c) => c.unreadCount > 0).length, [conversations]);
  const attentionTotal = useMemo(() => conversations.filter((c) => c.needsHuman).length, [conversations]);
  const channelCount = (ch: string) => conversations.filter((c) => c.channel === ch).length;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active?.messages.length, activeId]);

  // Live polling: refresh the inbox every few seconds so new inbound
  // messages appear without a manual reload.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setConversations((prev) => mergeConversations(prev, data.conversations));
      } catch {
        /* ignore transient polling errors */
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load saved quick replies once.
  useEffect(() => {
    fetch("/api/canned-responses")
      .then((r) => r.json())
      .then((d) => setQuickReplies(d.responses ?? []))
      .catch(() => {});
  }, []);

  // Mark the open conversation as read.
  useEffect(() => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c))
    );
    fetch(`/api/conversations/${activeId}/read`, { method: "POST" }).catch(() => {});
  }, [activeId]);

  async function send() {
    const body = draft.trim();
    if (!body || !active || sending) return;
    setSending(true);
    setDraft("");

    // Optimistic append
    const optimistic: MessageDTO = {
      id: `tmp-${Date.now()}`,
      direction: "OUTBOUND",
      body,
      status: "sending",
      createdAt: new Date().toISOString(),
    };
    updateConversation(active.id, (c) => ({
      ...c,
      messages: [...c.messages, optimistic],
      lastMessageAt: optimistic.createdAt,
    }));

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: active.id, body }),
      });
      const data = await res.json();
      updateConversation(active.id, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === optimistic.id
            ? { ...m, id: data.message?.id ?? m.id, status: res.ok ? data.message?.status ?? "sent" : "failed" }
            : m
        ),
      }));
    } catch {
      updateConversation(active.id, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === optimistic.id ? { ...m, status: "failed" } : m)),
      }));
    } finally {
      setSending(false);
    }
  }

  function updateConversation(id: string, fn: (c: ConversationDTO) => ConversationDTO) {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }

  async function aiDraft() {
    if (!active || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: active.id }),
      });
      const data = await res.json();
      if (res.ok && data.suggestion) setDraft(data.suggestion);
      else setAiError(data.error || "Couldn't generate a reply");
    } catch {
      setAiError("Couldn't reach the AI service");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="flex w-80 shrink-0 flex-col border-r border-white/10 bg-surface-panel">
        <div className="border-b border-white/10 px-4 py-4">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Inbox</h2>
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, number or message"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-surface-panel"
          />
          {/* Channel sub-tabs */}
          <div className="mt-3 flex gap-1 rounded-lg bg-white/5 p-1">
            {([
              { key: "all", label: "All" },
              { key: "whatsapp", label: "WhatsApp" },
              { key: "widget", label: "Widget" },
              { key: "website", label: "Web" },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setChannel(t.key)}
                className={clsx(
                  "flex-1 rounded-md px-2 py-1 text-xs font-medium transition",
                  channel === t.key ? "bg-brand-500/25 text-brand-200" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {t.label}
                {t.key !== "all" && channelCount(t.key) > 0 && <span className="ml-1 text-[10px] text-slate-500">{channelCount(t.key)}</span>}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => setFilter("all")}
              className={clsx("rounded-full px-3 py-1 text-xs font-medium transition", filter === "all" ? "bg-brand-500/20 text-brand-300" : "text-slate-400 hover:bg-white/5")}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={clsx("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition", filter === "unread" ? "bg-brand-500/20 text-brand-300" : "text-slate-400 hover:bg-white/5")}
            >
              Unread
              {unreadTotal > 0 && <span className="rounded-full bg-brand-500 px-1.5 text-[10px] text-slate-950">{unreadTotal}</span>}
            </button>
            <button
              onClick={() => setFilter("attention")}
              className={clsx("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition", filter === "attention" ? "bg-red-500/20 text-red-300" : "text-slate-400 hover:bg-white/5")}
            >
              Needs you
              {attentionTotal > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{attentionTotal}</span>}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.map((c) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={clsx(
                  "flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-white/5",
                  activeId === c.id && "bg-brand-500/15/60"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-300">
                  {initials(c.lead.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-medium text-slate-100">{c.lead.name}</p>
                    <span className="ml-2 shrink-0 text-xs text-slate-500">
                      {timeAgo(c.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ChannelBadge channel={c.channel} />
                    {c.needsHuman && <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300">⚠ needs you</span>}
                    <p className="truncate text-sm text-slate-400">{last?.body ?? "No messages yet"}</p>
                  </div>
                </div>
                {c.unreadCount > 0 && (
                  <span className="ml-1 mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-slate-950">
                    {c.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-slate-500">No conversations</p>
          )}
        </div>
      </div>

      {/* Thread */}
      {active ? (
        <>
        <div className="flex flex-1 flex-col bg-[#070709]">
          <div className="flex items-center justify-between border-b border-white/10 bg-surface-panel px-6 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-300">
                {initials(active.lead.name)}
              </span>
              <div>
                <p className="font-medium text-slate-100">{active.lead.name}</p>
                <div className="flex items-center gap-1.5">
                  <ChannelBadge channel={active.channel} />
                  <p className="text-xs text-slate-500">{active.lead.phone || active.lead.email || ""}</p>
                </div>
              </div>
            </div>
            <StatusBadge status={active.lead.status} />
          </div>

          {active.needsHuman && (
            <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-2 text-xs text-red-300">
              ⚠️ This customer may be frustrated — consider replying personally. Sending a message clears this flag.
            </div>
          )}

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-auto px-6 py-6">
            {active.messages.map((m) => (
              <div
                key={m.id}
                className={clsx("flex", m.direction === "OUTBOUND" ? "justify-end" : "justify-start")}
              >
                <div
                  className={clsx(
                    "max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                    m.direction === "OUTBOUND"
                      ? "rounded-br-sm bg-brand-500 text-slate-950"
                      : "rounded-bl-sm bg-surface-panel text-slate-100"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={clsx(
                      "mt-1 text-right text-[10px]",
                      m.direction === "OUTBOUND" ? "text-white/70" : "text-slate-500"
                    )}
                  >
                    {clockTime(m.createdAt)}
                    {m.direction === "OUTBOUND" && m.status === "sending" && " · sending"}
                    {m.direction === "OUTBOUND" && m.status === "failed" && " · failed"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative border-t border-white/10 bg-surface-panel px-4 py-3">
            {aiError && <p className="mb-2 text-xs text-red-400">{aiError}</p>}

            {showQuick && (
              <div className="absolute bottom-full left-4 mb-2 max-h-64 w-80 overflow-auto rounded-xl border border-white/10 bg-surface-raised p-1.5 shadow-xl">
                {quickReplies.length === 0 && (
                  <p className="px-3 py-3 text-xs text-slate-500">No quick replies yet. Add them in Settings.</p>
                )}
                {quickReplies.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setDraft((d) => (d ? d + " " + q.body : q.body));
                      setShowQuick(false);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left transition hover:bg-white/5"
                  >
                    <p className="text-sm font-medium text-slate-200">{q.title}</p>
                    <p className="truncate text-xs text-slate-500">{q.body}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <button
                onClick={() => setShowQuick((v) => !v)}
                title="Quick replies"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
              >
                💬
              </button>
              <button
                onClick={aiDraft}
                disabled={aiLoading}
                title="Draft a reply with AI"
                className="flex items-center gap-1 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
              >
                {aiLoading ? "…" : "✨ AI"}
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Type a message…"
                className="max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-surface-panel"
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim()}
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
        <ContactPanel lead={active.lead} users={users} />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-slate-500">
          Select a conversation to start chatting
        </div>
      )}
    </div>
  );
}

// Server data is the source of truth, but we keep any locally-pending
// optimistic messages (temp ids, not yet persisted) so they don't flicker
// out between a send and the next poll.
function mergeConversations(prev: ConversationDTO[], server: ConversationDTO[]): ConversationDTO[] {
  const prevById = new Map(prev.map((c) => [c.id, c]));
  return server.map((sc) => {
    const pc = prevById.get(sc.id);
    if (!pc) return sc;
    const serverKeys = new Set(sc.messages.map((m) => `${m.direction}|${m.body}`));
    const pending = pc.messages.filter(
      (m) => m.id.startsWith("tmp-") && !serverKeys.has(`${m.direction}|${m.body}`)
    );
    return { ...sc, messages: [...sc.messages, ...pending] };
  });
}

function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    whatsapp: { label: "WhatsApp", cls: "bg-green-500/15 text-green-300" },
    website: { label: "Website", cls: "bg-brand-500/20 text-brand-300" },
    instagram: { label: "Instagram", cls: "bg-pink-500/15 text-pink-300" },
  };
  const c = map[channel] ?? { label: channel || "Chat", cls: "bg-white/10 text-slate-300" };
  return <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${c.cls}`}>{c.label}</span>;
}

function ContactPanel({ lead, users }: { lead: ConversationDTO["lead"]; users: TeamUser[] }) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-white/10 bg-surface-panel xl:flex">
      <div className="flex flex-col items-center gap-2 border-b border-white/[5] px-6 py-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/20 text-lg font-semibold text-brand-300">
          {initials(lead.name)}
        </span>
        <p className="font-semibold text-slate-100">{lead.name}</p>
        {lead.company && <p className="text-sm text-slate-500">{lead.company}</p>}
        <StatusBadge status={lead.status} />
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Owner</p>
          <OwnerSelect leadId={lead.id} ownerId={lead.ownerId} users={users} />
        </div>
        <Field label="Phone" value={lead.phone || "—"} />
        <Field label="Channel" value="WhatsApp" />
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Tags</p>
          <div className="flex flex-wrap gap-1">
            {lead.tags.length === 0 && <span className="text-slate-600">No tags</span>}
            {lead.tags.map((t) => (
              <span key={t} className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs text-slate-300">
                {t}
              </span>
            ))}
          </div>
        </div>
        <NotesPanel key={lead.id} leadId={lead.id} />
      </div>
    </aside>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-slate-200">{value}</p>
    </div>
  );
}
