"use client";

import { useEffect, useState } from "react";

type Reply = { id: string; title: string; body: string };

export default function QuickReplies() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/canned-responses")
      .then((r) => r.json())
      .then((d) => setReplies(d.responses ?? []))
      .catch(() => {});
  }, []);

  async function add() {
    if (!title.trim() || !body.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/canned-responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setSaving(false);
    if (res.ok) {
      const { response } = await res.json();
      setReplies((prev) => [...prev, response]);
      setTitle("");
      setBody("");
    }
  }

  async function remove(id: string) {
    setReplies((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/canned-responses/${id}`, { method: "DELETE" });
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
      <h2 className="font-semibold text-slate-100">Quick replies</h2>
      <p className="mt-1 text-sm text-slate-400">Canned responses you can insert into the chat with one click.</p>

      <div className="mt-5 space-y-2">
        {replies.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200">{r.title}</p>
              <p className="truncate text-xs text-slate-500">{r.body}</p>
            </div>
            <button onClick={() => remove(r.id)} className="shrink-0 text-slate-500 hover:text-red-400" title="Delete">✕</button>
          </div>
        ))}
        {replies.length === 0 && <p className="text-sm text-slate-500">No quick replies yet.</p>}
      </div>

      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        <input className={field} placeholder="Title, e.g. Pricing" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={field} rows={2} placeholder="Message text…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button
          onClick={add}
          disabled={saving || !title.trim() || !body.trim()}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-50"
        >
          Add quick reply
        </button>
      </div>
    </div>
  );
}
