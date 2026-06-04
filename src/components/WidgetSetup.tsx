"use client";

import { useEffect, useState } from "react";

type Config = { title: string; welcome: string; color: string };

export default function WidgetSetup() {
  const [config, setConfig] = useState<Config | null>(null);
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/settings/widget")
      .then((r) => r.json())
      .then((d) => setConfig(d.config))
      .catch(() => {});
  }, []);

  if (!config) return <p className="text-sm text-slate-500">Loading…</p>;

  const snippet = `<script src="${origin}/widget.js" data-color="${config.color}" defer></script>`;

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/settings/widget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {/* Embed code */}
        <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
          <h2 className="font-semibold text-slate-100">Install on any website</h2>
          <p className="mt-1 text-sm text-slate-400">
            Paste this snippet just before the closing <code className="rounded bg-black/30 px-1">&lt;/body&gt;</code> tag of any site. That&apos;s it — a chat bubble appears and every conversation lands in your inbox.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-brand-300">{snippet}</pre>
          <button onClick={copy} className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600">
            {copied ? "Copied ✓" : "Copy code"}
          </button>
        </div>

        {/* Appearance */}
        <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
          <h2 className="font-semibold text-slate-100">Appearance</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Header title</label>
              <input className={field} value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Welcome message</label>
              <input className={field} value={config.welcome} onChange={(e) => setConfig({ ...config, welcome: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Accent color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config.color} onChange={(e) => setConfig({ ...config, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent" />
                <input className={field} value={config.color} onChange={(e) => setConfig({ ...config, color: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={save} disabled={saving} className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
              {saved && <span className="text-sm font-medium text-emerald-400">Saved ✓</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="h-fit rounded-2xl border border-white/10 bg-surface-panel p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Live preview</p>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="flex items-center gap-2 px-3 py-2.5 text-white" style={{ backgroundColor: config.color }}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs">💬</span>
            <span className="text-sm font-semibold">{config.title}</span>
          </div>
          <div className="space-y-2 bg-slate-50 p-3">
            <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">{config.welcome}</div>
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white shadow-sm" style={{ backgroundColor: config.color }}>
              What are your prices?
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          The widget answers using your <a href="/knowledge" className="text-brand-300 underline">Knowledge Base</a> and logs chats to <a href="/chat" className="text-brand-300 underline">Chat</a>.
        </p>
      </div>
    </div>
  );
}
