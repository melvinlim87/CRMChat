"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TEMPLATES, type TemplateKey } from "@/lib/flow-templates";

type Flow = { id: string; name: string; enabled: boolean; keyword: string | null; updatedAt: string };

export default function FlowsList({ initial }: { initial: Flow[] }) {
  const router = useRouter();
  const [flows, setFlows] = useState(initial);
  const [creating, setCreating] = useState<TemplateKey | null>(null);

  async function create(template: TemplateKey) {
    if (creating) return;
    setCreating(template);
    const res = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template }),
    });
    setCreating(null);
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
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="mb-3 text-sm font-medium text-slate-300">Create a flow</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => create(t.key)}
              disabled={creating !== null}
              className="group flex items-start gap-3 rounded-xl border border-white/10 bg-surface-panel p-4 text-left transition hover:border-brand-500/50 hover:bg-white/5 disabled:opacity-60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-xl">{t.icon}</span>
              <div className="min-w-0">
                <p className="font-medium text-slate-100">
                  {t.label}
                  {creating === t.key && <span className="ml-2 text-xs text-brand-300">creating…</span>}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-300">Your flows</p>
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
