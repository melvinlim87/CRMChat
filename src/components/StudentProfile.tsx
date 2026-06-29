"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OwnerSelect, { type TeamUser } from "./OwnerSelect";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  tags: string[];
  ownerId: string | null;
};

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

export default function StudentProfile({ lead, users }: { lead: Lead; users: TeamUser[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email || "",
    phone: lead.phone || "",
    company: lead.company || "",
  });
  const [status, setStatus] = useState(lead.status);
  const [tags, setTags] = useState<string[]>(lead.tags);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: object) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Couldn't save");
      return false;
    }
    setError(null);
    router.refresh();
    return true;
  }

  async function saveDetails() {
    setSaving(true);
    const ok = await patch(form);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  }

  async function changeStatus(s: string) {
    setStatus(s);
    await patch({ status: s });
  }

  async function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return setTagInput("");
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    await patch({ tags: next });
  }

  async function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    await patch({ tags: next });
  }

  async function remove() {
    if (!confirm(`Delete ${lead.name}? This cannot be undone.`)) return;
    await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    router.push("/leads");
    router.refresh();
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-100">Contact details</h2>
          <button onClick={remove} className="text-xs text-red-400 hover:text-red-300">Delete student</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-400">Name
            <input className={`${field} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-xs font-medium text-slate-400">Company
            <input className={`${field} mt-1`} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </label>
          <label className="text-xs font-medium text-slate-400">Phone
            <input className={`${field} mt-1`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="text-xs font-medium text-slate-400">Email
            <input className={`${field} mt-1`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex items-center gap-3">
          <button onClick={saveDetails} disabled={saving} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-sm font-medium text-emerald-400">Saved ✓</span>}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
          <h2 className="mb-3 font-semibold text-slate-100">Status &amp; owner</h2>
          <label className="text-xs font-medium text-slate-400">Status
            <select className={`${field} mt-1`} value={status} onChange={(e) => changeStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="mt-3 block text-xs font-medium text-slate-400">Owner
            <div className="mt-1"><OwnerSelect leadId={lead.id} ownerId={lead.ownerId} users={users} /></div>
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
          <h2 className="mb-3 font-semibold text-slate-100">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                {t}
                <button onClick={() => removeTag(t)} className="text-slate-500 hover:text-red-400">✕</button>
              </span>
            ))}
            {tags.length === 0 && <span className="text-xs text-slate-500">No tags</span>}
          </div>
          <input
            className={`${field} mt-3`}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder="Add a tag and press Enter"
          />
        </div>
      </div>
    </div>
  );
}
