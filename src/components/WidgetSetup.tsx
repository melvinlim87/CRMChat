"use client";

import { useEffect, useState } from "react";
import WidgetChat from "@/components/WidgetChat";

type Widget = {
  key: string;
  name: string;
  title: string;
  welcome: string;
  color: string;
  instruction: string | null;
  tag: string | null;
};

export default function WidgetSetup() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [activeKey, setActiveKey] = useState("public");
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embed, setEmbed] = useState<"floating" | "inline">("floating");
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/settings/widget")
      .then((r) => r.json())
      .then((d) => setWidgets(d.widgets ?? []))
      .catch(() => {});
  }, []);

  const active = widgets.find((w) => w.key === activeKey);
  if (!active) return <p className="text-sm text-slate-500">Loading…</p>;

  function update(patch: Partial<Widget>) {
    setWidgets((ws) => ws.map((w) => (w.key === activeKey ? { ...w, ...patch } : w)));
  }

  const themeAttr = previewTheme === "dark" ? ` data-theme="dark"` : "";
  const snippet =
    embed === "inline"
      ? `<!-- Put this where you want the assistant to appear (e.g. your AI Assistant panel) -->\n<div id="crmchat-assistant" style="height:600px"></div>\n<script src="${origin}/widget.js" data-widget="${active.key}" data-color="${active.color}"${themeAttr} data-inline="#crmchat-assistant" defer></script>`
      : `<script src="${origin}/widget.js" data-widget="${active.key}" data-color="${active.color}"${themeAttr} defer></script>`;

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/settings/widget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(active),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setWidgets(d.widgets);
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
    <div className="space-y-5">
      {/* Widget switcher */}
      <div className="flex gap-2">
        {widgets.map((w) => (
          <button
            key={w.key}
            onClick={() => setActiveKey(w.key)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              activeKey === w.key ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-white/10 text-slate-300 hover:bg-white/5"
            }`}
          >
            {w.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
            <h2 className="font-semibold text-slate-100">Embed the “{active.name}” widget</h2>
            <p className="mt-1 text-sm text-slate-400">Paste before <code className="rounded bg-black/30 px-1">&lt;/body&gt;</code> on the relevant site (e.g. your public site vs. your student portal).</p>

            <div className="mt-4 flex flex-wrap gap-4">
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-400">Embed type</p>
                <div className="inline-flex rounded-lg border border-white/10 p-0.5">
                  {(["floating", "inline"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setEmbed(opt)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${embed === opt ? "bg-brand-500 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
                    >
                      {opt === "floating" ? "Floating bubble" : "Inline panel"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-400">Theme</p>
                <div className="inline-flex rounded-lg border border-white/10 p-0.5">
                  {(["light", "dark"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPreviewTheme(opt)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${previewTheme === opt ? "bg-brand-500 text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {embed === "inline" && (
              <p className="mt-3 text-xs text-slate-400">Inline mode drops the assistant straight into a container on your page — perfect for an “AI Assistant” section. Use a dark theme to match a dark site.</p>
            )}

            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-brand-300">{snippet}</pre>
            <button onClick={copy} className="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600">
              {copied ? "Copied ✓" : "Copy code"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
            <h2 className="font-semibold text-slate-100">Settings</h2>
            <div className="mt-4 space-y-3">
              <Field label="Display name (internal)"><input className={field} value={active.name} onChange={(e) => update({ name: e.target.value })} /></Field>
              <Field label="Header title"><input className={field} value={active.title} onChange={(e) => update({ title: e.target.value })} /></Field>
              <Field label="Welcome message"><input className={field} value={active.welcome} onChange={(e) => update({ welcome: e.target.value })} /></Field>
              <Field label="AI instruction (persona for this widget)">
                <textarea rows={2} className={field} value={active.instruction ?? ""} onChange={(e) => update({ instruction: e.target.value })} placeholder="e.g. You are helping existing students." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tag new leads with"><input className={field} value={active.tag ?? ""} onChange={(e) => update({ tag: e.target.value })} placeholder="website / student" /></Field>
                <Field label="Accent color">
                  <div className="flex items-center gap-2">
                    <input type="color" value={active.color} onChange={(e) => update({ color: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent" />
                    <input className={field} value={active.color} onChange={(e) => update({ color: e.target.value })} />
                  </div>
                </Field>
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

        {/* Live preview — real widget */}
        <div className="h-fit rounded-2xl border border-white/10 bg-surface-panel p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Live preview — try it</p>
          {active.key === "public" && (
            <p className="mb-2 text-xs text-brand-300">This widget greets visitors with the “Are you a student?” gate.</p>
          )}
          <div className="h-[520px] overflow-hidden rounded-xl border border-white/10 shadow-lg">
            <WidgetChat
              key={`${active.key}|${active.welcome}|${active.color}|${active.title}|${previewTheme}`}
              config={active}
              widgetKey={active.key}
              gate={active.key === "public"}
              studentConfig={active.key === "public" ? widgets.find((w) => w.key === "students") : undefined}
              theme={previewTheme}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">Chats from this widget are tagged <span className="text-brand-300">{active.tag || "widget"}</span> in your inbox.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}
