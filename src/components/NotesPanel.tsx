"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

type Note = { id: string; body: string; author: string; createdAt: string };

export default function NotesPanel({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/leads/${leadId}/notes`)
      .then((r) => r.json())
      .then((d) => active && setNotes(d.notes ?? []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [leadId]);

  async function add() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true);
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSaving(false);
    if (res.ok) {
      const { note } = await res.json();
      setNotes((prev) => [note, ...prev]);
      setDraft("");
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Notes</p>
      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a note…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
        />
        <button
          onClick={add}
          disabled={saving || !draft.trim()}
          className="rounded-lg bg-brand-500 px-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {n.author} · {timeAgo(n.createdAt)}
            </p>
          </li>
        ))}
        {notes.length === 0 && <li className="text-xs text-slate-300">No notes yet.</li>}
      </ul>
    </div>
  );
}
