"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Flow = { id: string; name: string; enabled: boolean; keyword: string | null; updatedAt: string };

export default function FlowsList({ initial }: { initial: Flow[] }) {
  const router = useRouter();
  const [flows, setFlows] = useState(initial);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!name.trim() || creating) return;
    setCreating(true);
    const res = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setCreating(false);
    if (res.ok) {
      const { flow } = await res.json();
      router.push(`/flows/${flow.id}`);
    }
  }

  async function toggle(id: string, enabled: boolean) {
    setFlows((prev) => prev.map((f) => (f.id === id ? { ...f, enabled } : f)));
    await fetch(`/api/flows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  }

  async function remove(id: string) {
    setFlows((prev) => prev.filter((f) => f.id !== id));
    await fetch(`/api/flows/${id}`, { method: "DELETE" });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="New flow name, e.g. Lead qualification bot"
          className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          onClick={create}
          disabled={creating || !name.trim()}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-50"
        >
          Create flow
        </button>
      </div>

      <div className="space-y-3">
        {flows.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 bg-surface-panel px-5 py-12 text-center text-slate-500">
            No flows yet. Create one to build a visual WhatsApp AI conversation.
          </p>
        )}
        {flows.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-surface-panel p-4">
            <div className="min-w-0">
              <Link href={`/flows/${f.id}`} className="font-medium text-slate-100 hover:text-brand-300">
                {f.name}
              </Link>
              <p className="mt-0.5 text-sm text-slate-400">
                Trigger: {f.keyword ? `message contains “${f.keyword}”` : "any message"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <label className="inline-flex cursor-pointer items-center" title={f.enabled ? "Enabled" : "Disabled"}>
                <input type="checkbox" checked={f.enabled} onChange={(e) => toggle(f.id, e.target.checked)} className="peer sr-only" />
                <span className="relative h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-brand-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-surface-panel after:transition peer-checked:after:translate-x-4" />
              </label>
              <Link href={`/flows/${f.id}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/5">
                Edit
              </Link>
              <button onClick={() => remove(f.id)} className="text-slate-500 transition hover:text-red-500" title="Delete">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
