"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Automation = { id: string; name: string; enabled: boolean; trigger: string };

const TEMPLATES = [
  { key: "welcome-lead", icon: "👋", label: "Welcome new lead", desc: "When a lead is created → send a welcome + notify Slack." },
  { key: "keyword-route", icon: "🎯", label: "Route by keyword", desc: "On 'pricing' messages → tag + AI answer." },
  { key: "blank", icon: "✨", label: "Blank workflow", desc: "Start from a trigger and build your own." },
];

const TRIGGER_LABELS: Record<string, string> = {
  MESSAGE_RECEIVED: "Message received",
  LEAD_CREATED: "Lead created",
  FORM_SUBMITTED: "Form submitted",
};

export default function AutomationsList({ initial }: { initial: Automation[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [creating, setCreating] = useState<string | null>(null);

  async function create(template: string) {
    if (creating) return;
    setCreating(template);
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template }),
    });
    setCreating(null);
    if (res.ok) {
      const { automation } = await res.json();
      router.push(`/automations/${automation.id}`);
    }
  }

  async function toggle(id: string, enabled: boolean) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
    await fetch(`/api/automations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="mb-3 text-sm font-medium text-slate-300">Create a workflow</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => create(t.key)}
              disabled={creating !== null}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-surface-panel p-4 text-left transition hover:border-brand-500/50 hover:bg-white/5 disabled:opacity-60"
            >
              <span className="text-xl">{t.icon}</span>
              <span className="font-medium text-slate-100">{t.label}{creating === t.key && " …"}</span>
              <span className="text-xs text-slate-400">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-300">Your workflows</p>
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 bg-surface-panel px-5 py-12 text-center text-slate-500">
            No automations yet. Create a workflow above.
          </p>
        )}
        {items.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-surface-panel p-4">
            <div className="min-w-0">
              <Link href={`/automations/${a.id}`} className="font-medium text-slate-100 hover:text-brand-300">{a.name}</Link>
              <p className="mt-0.5 text-sm text-slate-500">Trigger: {TRIGGER_LABELS[a.trigger] || a.trigger}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <label className="inline-flex cursor-pointer items-center" title={a.enabled ? "Enabled" : "Disabled"}>
                <input type="checkbox" checked={a.enabled} onChange={(e) => toggle(a.id, e.target.checked)} className="peer sr-only" />
                <span className="relative h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-brand-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-surface-panel after:transition peer-checked:after:translate-x-4" />
              </label>
              <Link href={`/automations/${a.id}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/5">Edit</Link>
              <button onClick={() => remove(a.id)} className="text-slate-500 transition hover:text-red-500" title="Delete">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
