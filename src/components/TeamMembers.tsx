"use client";

import { useEffect, useState } from "react";

type User = { id: string; name: string | null; email: string };

export default function TeamMembers() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => {});
  }, []);

  async function add() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const { user } = await res.json();
      setUsers((u) => [...u, user]);
      setForm({ name: "", email: "", password: "" });
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Couldn't add user");
    }
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
      <h2 className="font-semibold text-slate-100">Team members</h2>
      <p className="mt-1 text-sm text-slate-400">People who can log in and be assigned to leads as the owner.</p>

      <div className="mt-5 space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-300">
              {(u.name || u.email).slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200">{u.name || "—"}</p>
              <p className="truncate text-xs text-slate-500">{u.email}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        <p className="text-sm font-medium text-slate-300">Add a team member</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={field} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={field} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={field} type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={add} disabled={saving || !form.name.trim() || !form.email.trim() || !form.password.trim()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-50">
          {saving ? "Adding…" : "Add member"}
        </button>
      </div>
    </div>
  );
}
