"use client";

import { useEffect, useState } from "react";

type Stats = {
  chats: number;
  chatsWeek: number;
  inbound: number;
  outbound: number;
  needsHuman: number;
  takenOver: number;
  feedbackUp: number;
  feedbackDown: number;
  bookings: number;
  topQuestions: { text: string; count: number }[];
};

export default function AssistantAnalytics() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/widget/stats")
      .then((r) => r.json())
      .then(setS)
      .catch(() => {});
  }, []);

  if (!s) return <p className="text-sm text-slate-500">Loading analytics…</p>;

  const satisfaction = s.feedbackUp + s.feedbackDown > 0 ? Math.round((s.feedbackUp / (s.feedbackUp + s.feedbackDown)) * 100) : null;

  const cards = [
    { label: "Conversations", value: s.chats, sub: `${s.chatsWeek} this week` },
    { label: "Visitor messages", value: s.inbound, sub: `${s.outbound} replies sent` },
    { label: "Bookings", value: s.bookings, sub: "calls scheduled" },
    { label: "Handed to a human", value: s.takenOver, sub: `${s.needsHuman} flagged` },
    { label: "Satisfaction", value: satisfaction === null ? "—" : `${satisfaction}%`, sub: `👍 ${s.feedbackUp} · 👎 ${s.feedbackDown}` },
  ];

  return (
    <div>
      <h2 className="font-semibold text-slate-100">Assistant analytics</h2>
      <p className="mt-1 text-sm text-slate-400">How your AI assistant is performing on the website.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-2xl font-semibold text-slate-100">{c.value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-300">{c.label}</p>
            <p className="text-[11px] text-slate-500">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Top questions</p>
        {s.topQuestions.length === 0 ? (
          <p className="text-xs text-slate-500">No questions yet.</p>
        ) : (
          <div className="space-y-1.5">
            {s.topQuestions.map((q, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5">
                <span className="truncate text-sm text-slate-200">{q.text}</span>
                <span className="shrink-0 rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-medium text-brand-300">{q.count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
