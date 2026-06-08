"use client";

import { useEffect, useState } from "react";

type Faq = { id: string; question: string; answer: string; category: string | null };

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

export default function FaqManager() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);

  function load() {
    fetch("/api/faqs")
      .then((r) => r.json())
      .then((d) => setFaqs(d.faqs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function add() {
    if (!question.trim() || !answer.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, category }),
    });
    setSaving(false);
    if (res.ok) {
      setQuestion("");
      setAnswer("");
      setCategory("");
      load();
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const res = await fetch(`/api/faqs/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (res.ok) {
      setEditing(null);
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this FAQ?")) return;
    await fetch(`/api/faqs/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Add form */}
      <div className="h-fit rounded-2xl border border-white/10 bg-surface-panel p-6">
        <h2 className="font-semibold text-slate-100">Add an FAQ</h2>
        <p className="mt-1 text-sm text-slate-400">FAQs are used by the AI assistant to answer visitors, and can be shown on your site.</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Question</label>
            <input className={field} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Do you offer refunds?" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Answer</label>
            <textarea rows={4} className={field} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write the answer the assistant should give." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Category (optional)</label>
            <input className={field} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Billing, Courses, Account…" />
          </div>
          <button
            onClick={add}
            disabled={saving || !question.trim() || !answer.trim()}
            className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add FAQ"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : faqs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">
            No FAQs yet. Add your first question on the left.
          </div>
        ) : (
          faqs.map((f) => (
            <div key={f.id} className="rounded-2xl border border-white/10 bg-surface-panel p-5">
              {editing?.id === f.id ? (
                <div className="space-y-2">
                  <input className={field} value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
                  <textarea rows={3} className={field} value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} />
                  <input className={field} value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Category" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-brand-600">Save</button>
                    <button onClick={() => setEditing(null)} className="rounded-lg border border-white/10 px-4 py-1.5 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {f.category && <span className="mb-1 inline-block rounded-full bg-brand-500/15 px-2 py-0.5 text-[11px] font-medium text-brand-300">{f.category}</span>}
                    <p className="font-medium text-slate-100">{f.question}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{f.answer}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => setEditing(f)} title="Edit" className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200">✎</button>
                    <button onClick={() => remove(f.id)} title="Delete" className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-white/5 hover:text-red-400">🗑</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
