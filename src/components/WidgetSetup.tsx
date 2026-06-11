"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WidgetChat from "@/components/WidgetChat";
import KnowledgeBase from "@/components/KnowledgeBase";
import AgentValidation from "@/components/AgentValidation";
import AssistantAnalytics from "@/components/AssistantAnalytics";

// Tone presets (kept in sync with TONES in lib/widget.ts; defined here to keep
// the server-only widget module out of this client bundle).
const TONES = [
  { key: "friendly", label: "Friendly" },
  { key: "professional", label: "Professional" },
  { key: "casual", label: "Casual" },
  { key: "enthusiastic", label: "Enthusiastic" },
  { key: "empathetic", label: "Empathetic" },
  { key: "concise", label: "Concise" },
];

type Widget = {
  key: string;
  name: string;
  title: string;
  welcome: string;
  color: string;
  instruction: string | null;
  tag: string | null;
  starters: string[];
  avatar: string | null;
  tone: string;
  flowEnabled: boolean;
  // Opaque flow graph — edited in the dedicated builder, passed through to the widget.
  flow: { nodes?: any[]; edges?: any[] };
  gateEnabled: boolean;
  gateHeading: string;
  studentLabel: string;
  visitorLabel: string;
  studentColor: string | null;
  visitorColor: string | null;
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
  const [inlineHeight, setInlineHeight] = useState("600px");
  const [uploading, setUploading] = useState(false);

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
  const h = inlineHeight.trim() || "600px";
  const fill = h === "100%" || h === "fill";
  const snippet =
    embed === "inline"
      ? `<!-- Put this where you want the assistant to appear (e.g. your AI Assistant panel) -->\n<div id="crmchat-assistant"${fill ? ' style="height:600px"' : ""}></div>\n<script src="${origin}/widget.js" data-widget="${active.key}" data-color="${active.color}"${themeAttr} data-inline="#crmchat-assistant" data-height="${h}" defer></script>`
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

  async function uploadAvatar(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const d = await res.json();
      update({ avatar: d.url });
    } else {
      alert("Upload failed (images only, max 5 MB).");
    }
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

  return (
    <div className="space-y-5">
      {/* Analytics */}
      <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
        <AssistantAnalytics />
      </div>

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
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">Panel height</span>
                  {["520px", "600px", "700px", "100%"].map((h) => (
                    <button
                      key={h}
                      onClick={() => setInlineHeight(h)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition ${inlineHeight === h ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
                    >
                      {h === "100%" ? "Fill panel" : h}
                    </button>
                  ))}
                  <input
                    value={inlineHeight}
                    onChange={(e) => setInlineHeight(e.target.value)}
                    className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 outline-none focus:border-brand-500"
                    placeholder="e.g. 80vh"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Inline mode drops the assistant into a container on your page. Choose <b>Fill panel</b> to expand to your AI Assistant card (the card must have its own height), or set a fixed height. Use a dark theme to match a dark site.
                </p>
              </div>
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
              <Field label="AI tone of voice">
                <select className={field} value={active.tone ?? "friendly"} onChange={(e) => update({ tone: e.target.value })}>
                  {TONES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="AI instruction (persona for this widget)">
                <textarea rows={2} className={field} value={active.instruction ?? ""} onChange={(e) => update({ instruction: e.target.value })} placeholder="e.g. You are helping existing students." />
              </Field>
              <Field label="Starter prompts (one per line — shown as tappable buttons when the chat opens)">
                <textarea
                  rows={3}
                  className={field}
                  value={(active.starters ?? []).join("\n")}
                  onChange={(e) => update({ starters: e.target.value.split("\n") })}
                  placeholder={"What do you offer?\nHow do I get started?\nPricing & plans"}
                />
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
              <Field label="Header logo / avatar">
                <div className="flex items-center gap-3">
                  {active.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={active.avatar} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-lg ring-1 ring-white/10">🤖</span>
                  )}
                  <label className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5">
                    {uploading ? "Uploading…" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                  </label>
                  {active.avatar && (
                    <button onClick={() => update({ avatar: null })} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-red-400">Remove</button>
                  )}
                </div>
                <input className={`${field} mt-2`} value={active.avatar ?? ""} onChange={(e) => update({ avatar: e.target.value || null })} placeholder="…or paste an image URL" />
              </Field>
              {/* Intro flow */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <label className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-medium text-slate-200">Intro flow (“Are you a student?” gate)</span>
                    <span className="block text-xs text-slate-400">Ask visitors who they are first. Students sign in with their email; others chat straight away.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={active.gateEnabled}
                    onChange={(e) => update({ gateEnabled: e.target.checked })}
                    className="h-5 w-5 shrink-0 accent-brand-500"
                  />
                </label>
                {active.gateEnabled && (
                  <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
                    <Field label="Gate heading"><input className={field} value={active.gateHeading} onChange={(e) => update({ gateHeading: e.target.value })} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Student button"><input className={field} value={active.studentLabel} onChange={(e) => update({ studentLabel: e.target.value })} /></Field>
                      <Field label="Visitor button"><input className={field} value={active.visitorLabel} onChange={(e) => update({ visitorLabel: e.target.value })} /></Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Student button colour">
                        <GateColor value={active.studentColor} fallback={widgets.find((w) => w.key === "students")?.color || active.color} onChange={(v) => update({ studentColor: v })} />
                      </Field>
                      <Field label="Visitor button colour">
                        <GateColor value={active.visitorColor} fallback="" outlineLabel="Outline" onChange={(v) => update({ visitorColor: v })} />
                      </Field>
                    </div>
                  </div>
                )}
              </div>

              {/* Visual flow */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <span>
                  <span className="block text-sm font-medium text-slate-200">Visual flow builder {active.flowEnabled && <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-400">On</span>}</span>
                  <span className="block text-xs text-slate-400">Design a guided conversation with buttons, branches, lead capture and AI handoff.</span>
                </span>
                <Link href={`/chat-widget/flow/${active.key}`} className="shrink-0 rounded-lg border border-brand-500/50 bg-brand-500/15 px-3 py-1.5 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/25">
                  Open builder →
                </Link>
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
          {active.gateEnabled && (
            <p className="mb-2 text-xs text-brand-300">This widget greets visitors with the intro flow first.</p>
          )}
          <div className="widget-preview-frame h-[520px] overflow-hidden rounded-xl border border-white/10 shadow-lg">
            <WidgetChat
              key={`${active.key}|${active.welcome}|${active.color}|${active.title}|${previewTheme}|${active.gateEnabled}|${active.tone}|${active.gateHeading}|${active.studentLabel}|${active.visitorLabel}|${active.avatar}|${active.flowEnabled}|${active.studentColor}|${active.visitorColor}`}
              config={active}
              widgetKey={active.key}
              gate={active.gateEnabled}
              studentConfig={active.gateEnabled ? widgets.find((w) => w.key === "students") : undefined}
              theme={previewTheme}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">Chats from this widget are tagged <span className="text-brand-300">{active.tag || "widget"}</span> in your inbox.</p>
        </div>
      </div>

      {/* Knowledge base — what the assistant answers from */}
      <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
        <h2 className="font-semibold text-slate-100">Knowledge base</h2>
        <p className="mt-1 text-sm text-slate-400">
          Upload PDFs (handbooks, pricing, policies) so the assistant can answer from them. Shared across all widgets, alongside your <Link href="/faq" className="text-brand-300 hover:underline">FAQs</Link>.
        </p>
        <div className="mt-4">
          <KnowledgeBase />
        </div>
      </div>

      {/* Test / validate the AI agent */}
      <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
        <AgentValidation />
      </div>

      {/* WhatsApp integration */}
      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.07] p-6">
        <h2 className="font-semibold text-slate-100">WhatsApp Integration</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Connect this knowledge base to your WhatsApp account for autonomous customer engagement. Optimize instant customer support and sales operations.
        </p>
        <Link href="/integrations" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300">
          Configure WhatsApp Agent →
        </Link>
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

// Colour picker that supports an empty "default" state (null).
function GateColor({
  value,
  fallback,
  outlineLabel,
  onChange,
}: {
  value: string | null;
  fallback: string;
  outlineLabel?: string;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || fallback || "#cda14a"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
      />
      <input
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
        value={value ?? ""}
        placeholder={value ? "" : outlineLabel || "Default"}
        onChange={(e) => onChange(e.target.value.trim() || null)}
      />
      {value && (
        <button onClick={() => onChange(null)} className="shrink-0 text-xs text-slate-400 hover:text-red-400" title="Reset to default">
          Reset
        </button>
      )}
    </div>
  );
}
