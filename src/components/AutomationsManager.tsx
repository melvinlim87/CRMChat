"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Automation, AutomationAction } from "@prisma/client";

const ACTION_LABELS: Record<AutomationAction, string> = {
  AUTO_REPLY: "Send auto-reply",
  ADD_TAG: "Add tag",
  SET_STATUS: "Set status",
};

const ACTION_HINTS: Record<AutomationAction, string> = {
  AUTO_REPLY: "Message to send back",
  ADD_TAG: "Tag to add to the lead",
  SET_STATUS: "Status (NEW, CONTACTED, QUALIFIED, WON, LOST)",
};

export default function AutomationsManager({ initial }: { initial: Automation[] }) {
  const router = useRouter();
  const [automations, setAutomations] = useState(initial);
  const [name, setName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [action, setAction] = useState<AutomationAction>("AUTO_REPLY");
  const [actionValue, setActionValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, keyword, action, actionValue }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setAutomations((prev) => [data.automation, ...prev]);
      setName("");
      setKeyword("");
      setActionValue("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create automation");
    }
  }

  async function toggle(id: string, enabled: boolean) {
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  }

  async function remove(id: string) {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
  }

  return (
    <div className="grid max-w-4xl gap-8 lg:grid-cols-[1fr_320px]">
      {/* List */}
      <div className="space-y-3">
        {automations.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 bg-surface-panel px-5 py-12 text-center text-slate-500">
            No automations yet. Create one to auto-reply, tag, or update leads when a message arrives.
          </p>
        )}
        {automations.map((a) => (
          <div key={a.id} className="rounded-xl border border-white/10 bg-surface-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-100">{a.name}</p>
                <p className="mt-1 text-sm text-slate-400">
                  When a message{" "}
                  {a.keyword ? (
                    <>
                      contains <span className="font-medium text-slate-200">“{a.keyword}”</span>
                    </>
                  ) : (
                    "arrives"
                  )}{" "}
                  → <span className="font-medium text-slate-200">{ACTION_LABELS[a.action]}</span>:{" "}
                  <span className="text-slate-300">{a.actionValue}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <label className="inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={a.enabled}
                    onChange={(e) => toggle(a.id, e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="relative h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-brand-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-surface-panel after:transition peer-checked:after:translate-x-4" />
                </label>
                <button
                  onClick={() => remove(a.id)}
                  className="text-slate-500 transition hover:text-red-500"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create form */}
      <div className="h-fit rounded-xl border border-white/10 bg-surface-panel p-5">
        <h3 className="font-semibold text-slate-100">New automation</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pricing auto-reply"
              className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Keyword <span className="text-slate-500">(optional)</span>
            </label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Leave blank to match any message"
              className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as AutomationAction)}
              className="w-full rounded-lg border border-white/10 bg-surface-panel px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="AUTO_REPLY">Send auto-reply</option>
              <option value="ADD_TAG">Add tag</option>
              <option value="SET_STATUS">Set status</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">{ACTION_HINTS[action]}</label>
            {action === "AUTO_REPLY" ? (
              <textarea
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            ) : (
              <input
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={create}
            disabled={saving || !name.trim() || !actionValue.trim()}
            className="w-full rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create automation"}
          </button>
        </div>
      </div>
    </div>
  );
}
