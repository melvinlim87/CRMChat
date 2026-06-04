"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string | null; email: string };

export default function NewLead({ users }: { users: User[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", company: "", status: "NEW", ownerId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", phone: "", email: "", company: "", status: "NEW", ownerId: "" });
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Couldn't add contact");
    }
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600">
        + New lead
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Add a contact to the pipeline</h3>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>
            <div className="space-y-3">
              <input className={field} placeholder="Full name *" value={form.name} onChange={(e) => set("name", e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className={field} placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                <input className={field} placeholder="Email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <input className={field} placeholder="Company" value={form.company} onChange={(e) => set("company", e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <select className={field} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  {["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className={field} value={form.ownerId} onChange={(e) => set("ownerId", e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <button onClick={save} disabled={saving || !form.name.trim()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-50">
                {saving ? "Adding…" : "Add contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
