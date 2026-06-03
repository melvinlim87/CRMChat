"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { TeamUser } from "./OwnerSelect";

export default function OwnerFilter({ users }: { users: TeamUser[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("owner") ?? "";

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("owner", value);
    else next.delete("owner");
    router.push(`/leads?${next.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500"
    >
      <option value="">All owners</option>
      <option value="unassigned">Unassigned</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name || u.email}
        </option>
      ))}
    </select>
  );
}
