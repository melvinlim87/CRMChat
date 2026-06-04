"use client";

import { useEffect, useState } from "react";
import type { AIProvider, ModelOption } from "@/lib/ai";

type Catalog = Record<AIProvider, { label: string; models: ModelOption[] }>;
type Settings = {
  provider: AIProvider;
  model: string;
  keysSet: Record<AIProvider, boolean>;
};

const PROVIDERS: AIProvider[] = ["anthropic", "openai", "google"];

export default function AISettingsForm() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keys, setKeys] = useState<Record<AIProvider, string>>({ anthropic: "", openai: "", google: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/ai")
      .then((r) => r.json())
      .then((d) => {
        setCatalog(d.catalog);
        setSettings(d.settings);
      })
      .catch(() => {});
  }, []);

  if (!catalog || !settings) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  const models = catalog[settings.provider].models;

  function setProvider(provider: AIProvider) {
    setSettings((s) => s && { ...s, provider, model: catalog![provider].models[0].id });
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/settings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: settings!.provider, model: settings!.model, keys }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setSettings(d.settings);
      setKeys({ anthropic: "", openai: "", google: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
        <h2 className="font-semibold text-slate-100">AI model</h2>
        <p className="mt-1 text-sm text-slate-400">Choose the provider and model used for AI replies and flows.</p>

        <div className="mt-5">
          <label className="mb-1.5 block text-sm font-medium text-slate-200">Provider</label>
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  settings.provider === p
                    ? "border-brand-500 bg-brand-500/15 text-brand-300"
                    : "border-white/10 text-slate-300 hover:bg-white/5"
                }`}
              >
                {catalog[p].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-200">Model</label>
          <select
            value={settings.model}
            onChange={(e) => setSettings((s) => s && { ...s, model: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-surface-panel px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
        <h2 className="font-semibold text-slate-100">API keys</h2>
        <p className="mt-1 text-sm text-slate-400">
          Stored for your workspace. Leave a field blank to keep the existing key.
        </p>

        <div className="mt-5 space-y-4">
          {PROVIDERS.map((p) => (
            <div key={p}>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-200">
                {catalog[p].label} key
                {settings.keysSet[p] && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                    saved
                  </span>
                )}
              </label>
              <input
                type="password"
                value={keys[p]}
                onChange={(e) => setKeys((k) => ({ ...k, [p]: e.target.value }))}
                placeholder={settings.keysSet[p] ? "••••••••  (unchanged)" : `Paste your ${catalog[p].label} key`}
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}
      </div>
    </div>
  );
}
