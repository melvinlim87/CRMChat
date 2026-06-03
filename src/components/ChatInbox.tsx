"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import clsx from "clsx";
import type { LeadStatus, MessageDirection } from "@prisma/client";
import StatusBadge from "./StatusBadge";
import OwnerSelect, { type TeamUser } from "./OwnerSelect";
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
  lastMessageAt: string;
  lead: {
    id: string;
    name: string;
    phone: string | null;
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
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.lead.name.toLowerCase().includes(q) ||
        (c.lead.company || "").toLowerCase().includes(q) ||
        (c.lead.phone || "").includes(q)
    );
  }, [conversations, search]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [active?.messages.length, activeId]);

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

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Inbox</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.map((c) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={clsx(
                  "flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50",
                  activeId === c.id && "bg-brand-50/60"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {initials(c.lead.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-medium text-slate-900">{c.lead.name}</p>
                    <span className="ml-2 shrink-0 text-xs text-slate-400">
                      {timeAgo(c.lastMessageAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-slate-500">{last?.body ?? "No messages yet"}</p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="ml-1 mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white">
                    {c.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-slate-400">No conversations</p>
          )}
        </div>
      </div>

      {/* Thread */}
      {active ? (
        <>
        <div className="flex flex-1 flex-col bg-[#fdf6f0]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {initials(active.lead.name)}
              </span>
              <div>
                <p className="font-medium text-slate-900">{active.lead.name}</p>
                <p className="text-xs text-slate-400">{active.lead.phone || "WhatsApp"}</p>
              </div>
            </div>
            <StatusBadge status={active.lead.status} />
          </div>

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
                      ? "rounded-br-sm bg-brand-500 text-white"
                      : "rounded-bl-sm bg-white text-slate-800"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={clsx(
                      "mt-1 text-right text-[10px]",
                      m.direction === "OUTBOUND" ? "text-white/70" : "text-slate-400"
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

          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex items-end gap-2">
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
                className="max-h-32 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-white"
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim()}
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
        <ContactPanel lead={active.lead} users={users} />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-slate-400">
          Select a conversation to start chatting
        </div>
      )}
    </div>
  );
}

function ContactPanel({ lead, users }: { lead: ConversationDTO["lead"]; users: TeamUser[] }) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-slate-200 bg-white xl:flex">
      <div className="flex flex-col items-center gap-2 border-b border-slate-100 px-6 py-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
          {initials(lead.name)}
        </span>
        <p className="font-semibold text-slate-900">{lead.name}</p>
        {lead.company && <p className="text-sm text-slate-400">{lead.company}</p>}
        <StatusBadge status={lead.status} />
      </div>

      <div className="space-y-5 px-6 py-5 text-sm">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Owner</p>
          <OwnerSelect leadId={lead.id} ownerId={lead.ownerId} users={users} />
        </div>
        <Field label="Phone" value={lead.phone || "—"} />
        <Field label="Channel" value="WhatsApp" />
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Tags</p>
          <div className="flex flex-wrap gap-1">
            {lead.tags.length === 0 && <span className="text-slate-300">No tags</span>}
            {lead.tags.map((t) => (
              <span key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-slate-700">{value}</p>
    </div>
  );
}
