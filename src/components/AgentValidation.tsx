"use client";

import { useEffect, useState } from "react";

const TONES = [
  { key: "friendly", label: "Friendly" },
  { key: "professional", label: "Professional" },
  { key: "casual", label: "Casual" },
  { key: "enthusiastic", label: "Enthusiastic" },
  { key: "empathetic", label: "Empathetic" },
  { key: "concise", label: "Concise" },
  { key: "customer-service", label: "Customer Service" },
];

type ModelOpt = { provider: string; id: string; label: string };
type Recent = { id: string; query: string; createdAt: string };

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

export default function AgentValidation() {
  const [models, setModels] = useState<ModelOpt[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [tone, setTone] = useState("customer-service");
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // API-key connection state.
  const [keysSet, setKeysSet] = useState<Record<string, boolean>>({});
  const [providerLabels, setProviderLabels] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyMsg, setKeyMsg] = useState("");

  function loadSettings() {
    return fetch("/api/settings/ai")
      .then((r) => r.json())
      .then((d) => {
        const catalog = d.catalog ?? {};
        const opts: ModelOpt[] = [];
        const labels: Record<string, string> = {};
        for (const p of Object.keys(catalog)) {
          labels[p] = catalog[p].label;
          for (const m of catalog[p].models ?? []) {
            opts.push({ provider: p, id: m.id, label: `[${catalog[p].label}] ${m.label}` });
          }
        }
        setModels(opts);
        setProviderLabels(labels);
        setProviders((d.settings?.providerOrder ?? Object.keys(catalog)).filter((p: string) => catalog[p]));
        setKeysSet(d.settings?.keysSet ?? {});
        const cur = d.settings;
        setProvider((prev) => prev || cur?.provider || opts[0]?.provider || "");
        setModel((prev) => prev || cur?.model || opts[0]?.id || "");
        return d;
      });
  }

  useEffect(() => {
    loadSettings().catch(() => {});
    loadRecent();
  }, []);

  function loadRecent() {
    fetch("/api/widget/test")
      .then((r) => r.json())
      .then((d) => {
        setRecent(d.recent ?? []);
        setSelected(new Set());
      })
      .catch(() => {});
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === recent.length ? new Set() : new Set(recent.map((r) => r.id))));
  }
  async function deleteSelected() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    setRecent((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    await fetch("/api/widget/test", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
  }

  function changeProvider(p: string) {
    setProvider(p);
    setApiKey("");
    setKeyMsg("");
    // default to that provider's first catalog model
    const first = models.find((m) => m.provider === p);
    if (first) setModel(first.id);
  }

  async function connectKey() {
    if (!apiKey.trim() || savingKey) return;
    setSavingKey(true);
    setKeyMsg("");
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: { [provider]: apiKey.trim() } }),
      });
      if (res.ok) {
        setApiKey("");
        setKeyMsg("Connected ✓");
        await loadSettings();
      } else {
        setKeyMsg("Couldn't save key");
      }
    } catch {
      setKeyMsg("Couldn't save key");
    } finally {
      setSavingKey(false);
    }
  }

  async function run() {
    if (!query.trim() || running) return;
    setRunning(true);
    setAnswer(null);
    setError(null);
    try {
      const res = await fetch("/api/widget/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, provider, model, tone }),
      });
      const d = await res.json();
      if (d.text) setAnswer(d.text);
      else setError(d.error || "No response — check your AI provider key in Settings.");
      loadRecent();
    } catch {
      setError("Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Console */}
      <div>
        <h2 className="font-semibold text-slate-100">Validate the AI agent</h2>
        <p className="mt-1 text-sm text-slate-400">Run a query against your knowledge base to test answers before going live.</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">AI Model</label>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <select className={field} value={provider} onChange={(e) => changeProvider(e.target.value)}>
                {providers.map((p) => (
                  <option key={p} value={p}>{providerLabels[p] || p}</option>
                ))}
              </select>
              <input
                className={field}
                list="cc-model-list"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Search or type a model id…"
              />
              <datalist id="cc-model-list">
                {models.filter((m) => m.provider === provider).map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </datalist>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Pick a provider, then search the list or paste any model id that provider supports.</p>

            {/* API key — connect the selected provider */}
            <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              {keysSet[provider] && !apiKey ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-400">✓ {providerLabels[provider] || provider} connected</span>
                  <button onClick={() => setKeysSet((k) => ({ ...k, [provider]: false }))} className="text-xs text-slate-400 hover:text-slate-200">
                    Replace key
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && connectKey()}
                    placeholder={`${providerLabels[provider] || "Provider"} API key`}
                    className="flex-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={connectKey}
                    disabled={savingKey || !apiKey.trim()}
                    className="shrink-0 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-50"
                  >
                    {savingKey ? "…" : "Connect"}
                  </button>
                </div>
              )}
              {keyMsg && <p className="mt-1 text-[11px] text-slate-400">{keyMsg}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">AI Tone</label>
            <select className={field} value={tone} onChange={(e) => setTone(e.target.value)}>
              {TONES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
          <textarea
            rows={4}
            className={field}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Submit query regarding knowledge base content…"
          />
          <button
            onClick={run}
            disabled={running || !query.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {running ? "Running…" : "▷ Execute Query"}
          </button>
        </div>

        {(answer || error) && (
          <div className={`mt-4 rounded-xl border p-4 text-sm ${error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-white/10 bg-white/[0.03] text-slate-200"}`}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{error ? "Error" : "Response"}</p>
            <p className="whitespace-pre-wrap">{error || answer}</p>
          </div>
        )}
      </div>

      {/* Recent queries */}
      <div className="h-fit rounded-2xl border border-white/10 bg-surface-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Recent queries</p>
          {recent.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-400">
                <input type="checkbox" checked={selected.size === recent.length} onChange={toggleAll} className="accent-brand-500" />
                All
              </label>
              {selected.size > 0 && (
                <button onClick={deleteSelected} className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-300 transition hover:bg-red-500/20">
                  🗑 Delete ({selected.size})
                </button>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          {recent.length === 0 && <p className="text-xs text-slate-500">No queries yet.</p>}
          {recent.map((r) => (
            <div
              key={r.id}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 transition ${
                selected.has(r.id) ? "border-brand-500/50 bg-brand-500/10" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                className="mt-0.5 accent-brand-500"
              />
              <button onClick={() => setQuery(r.query)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm text-slate-200">{r.query}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</p>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
