"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TeamUser } from "./OwnerSelect";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

export default function StudentsFilters({ users, tags }: { users: TeamUser[]; tags: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function navigate(next: URLSearchParams) {
    const s = next.toString();
    router.push(s ? `/leads?${s}` : "/leads");
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    navigate(next);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setParam("q", q.trim());
  }

  const status = params.get("status") ?? "";
  const tag = params.get("tag") ?? "";
  const owner = params.get("owner") ?? "";
  const active = Boolean(params.get("q") || status || tag || owner);

  const select = "rounded-lg border border-white/10 bg-surface-panel px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={submitSearch} className="flex-1 min-w-[200px]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone, email…"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
        />
      </form>
      <select value={status} onChange={(e) => setParam("status", e.target.value)} className={select}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={tag} onChange={(e) => setParam("tag", e.target.value)} className={select}>
        <option value="">All tags</option>
        {tags.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <select value={owner} onChange={(e) => setParam("owner", e.target.value)} className={select}>
        <option value="">All owners</option>
        <option value="unassigned">Unassigned</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
      </select>
      {active && (
        <button onClick={() => { setQ(""); router.push("/leads"); }} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 hover:bg-white/5">
          Clear
        </button>
      )}
    </div>
  );
}
