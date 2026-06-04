"use client";

import { useEffect, useState } from "react";
import type { AIProvider, ModelOption } from "@/lib/ai";

type Catalog = Record<AIProvider, { label: string; free?: boolean; models: ModelOption[] }>;
type Settings = {
  provider: AIProvider;
  model: string;
  keysSet: Record<AIProvider, boolean>;
  providerOrder: AIProvider[];
};

// Where to get a key for each provider (free where noted).
const KEY_LINKS: Partial<Record<AIProvider, { url: string; label: string }>> = {
  groq: { url: "https://console.groq.com/keys", label: "console.groq.com/keys — free" },
  google: { url: "https://aistudio.google.com/apikey", label: "aistudio.google.com/apikey — free" },
  openrouter: { url: "https://openrouter.ai/keys", label: "openrouter.ai/keys" },
  openai: { url: "https://platform.openai.com/api-keys", label: "platform.openai.com/api-keys" },
  anthropic: { url: "https://console.anthropic.com/settings/keys", label: "console.anthropic.com" },
};

export default function AISettingsForm() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
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

  if (!catalog || !settings) return <p className="text-sm text-slate-500">Loading…</p>;

  const providers = settings.providerOrder ?? (Object.keys(catalog) as AIProvider[]);
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
      setKeys({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
        <h2 className="font-semibold text-slate-100">AI provider &amp; model</h2>
        <p className="mt-1 text-sm text-slate-400">
          Pick any provider. <span className="text-emerald-400">Groq</span> and{" "}
          <span className="text-emerald-400">Google Gemini</span> have free keys; <span className="text-emerald-400">Ollama</span> runs locally with no key.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {providers.map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`flex items-center justify-between gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                settings.provider === p ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-white/10 text-slate-300 hover:bg-white/5"
              }`}
            >
              <span className="truncate">{catalog[p].label}</span>
              {settings.keysSet[p] && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" title="ready" />}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-200">Model</label>
          <select
            value={settings.model}
            onChange={(e) => setSettings((s) => s && { ...s, model: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-surface-panel px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
        <h2 className="font-semibold text-slate-100">API keys</h2>
        <p className="mt-1 text-sm text-slate-400">Add a key for whichever provider you want to use. Leave blank to keep an existing key.</p>

        <div className="mt-5 space-y-4">
          {providers.map((p) =>
            p === "ollama" ? (
              <div key={p} className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
                <span className="font-medium text-slate-200">{catalog[p].label}</span> needs no key — install it from{" "}
                <a className="text-brand-300 underline" href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com</a>, run{" "}
                <code className="rounded bg-black/30 px-1">ollama run llama3.2</code>, and it works locally &amp; private.
              </div>
            ) : (
              <div key={p}>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-200">
                  {catalog[p].label} key
                  {catalog[p].free && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">free</span>}
                  {settings.keysSet[p] && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">saved</span>}
                </label>
                <input
                  type="password"
                  value={keys[p] ?? ""}
                  onChange={(e) => setKeys((k) => ({ ...k, [p]: e.target.value }))}
                  placeholder={settings.keysSet[p] ? "••••••••  (unchanged)" : `Paste your ${catalog[p].label} key`}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                {KEY_LINKS[p] && (
                  <a className="mt-1 inline-block text-xs text-slate-500 hover:text-brand-300" href={KEY_LINKS[p]!.url} target="_blank" rel="noreferrer">
                    Get a key → {KEY_LINKS[p]!.label}
                  </a>
                )}
              </div>
            )
          )}
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
        {saved && <span className="text-sm font-medium text-emerald-400">Saved ✓</span>}
      </div>
    </div>
  );
}
