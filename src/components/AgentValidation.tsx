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
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [tone, setTone] = useState("customer-service");
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    fetch("/api/settings/ai")
      .then((r) => r.json())
      .then((d) => {
        const catalog = d.catalog ?? {};
        const opts: ModelOpt[] = [];
        for (const p of Object.keys(catalog)) {
          for (const m of catalog[p].models ?? []) {
            opts.push({ provider: p, id: m.id, label: `[${catalog[p].label}] ${m.label}` });
          }
        }
        setModels(opts);
        const cur = d.settings;
        if (cur?.provider && cur?.model) {
          setProvider(cur.provider);
          setModel(cur.model);
        } else if (opts[0]) {
          setProvider(opts[0].provider);
          setModel(opts[0].id);
        }
      })
      .catch(() => {});
    loadRecent();
  }, []);

  function loadRecent() {
    fetch("/api/widget/test")
      .then((r) => r.json())
      .then((d) => setRecent(d.recent ?? []))
      .catch(() => {});
  }

  function pickModel(value: string) {
    const opt = models.find((m) => `${m.provider}|${m.id}` === value);
    if (opt) {
      setProvider(opt.provider);
      setModel(opt.id);
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
            <select className={field} value={`${provider}|${model}`} onChange={(e) => pickModel(e.target.value)}>
              {models.map((m) => (
                <option key={`${m.provider}|${m.id}`} value={`${m.provider}|${m.id}`}>{m.label}</option>
              ))}
            </select>
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
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Recent queries</p>
        <div className="space-y-2">
          {recent.length === 0 && <p className="text-xs text-slate-500">No queries yet.</p>}
          {recent.map((r) => (
            <button
              key={r.id}
              onClick={() => setQuery(r.query)}
              className="block w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/5"
            >
              <p className="truncate text-sm text-slate-200">{r.query}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
