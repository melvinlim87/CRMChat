"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type TeamUser = { id: string; name: string | null; email: string };

export default function OwnerSelect({
  leadId,
  ownerId,
  users,
  compact = false,
}: {
  leadId: string;
  ownerId: string | null;
  users: TeamUser[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(ownerId ?? "");
  const [saving, setSaving] = useState(false);

  async function onChange(next: string) {
    setValue(next);
    setSaving(true);
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: next || null }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={value}
      disabled={saving}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={
        compact
          ? "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-500 disabled:opacity-60"
          : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 disabled:opacity-60"
      }
    >
      <option value="">Unassigned</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name || u.email}
        </option>
      ))}
    </select>
  );
}
