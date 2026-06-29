"use client";

import { useEffect, useState } from "react";

const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

export default function WhatsAppConfig() {
  const [connected, setConnected] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("crmchat-verify");
  const [aiReply, setAiReply] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetch("/api/integrations/whatsapp")
      .then((r) => r.json())
      .then((d) => {
        setConnected(Boolean(d.connected));
        setHasToken(Boolean(d.hasToken));
        setPhoneNumberId(d.phoneNumberId || "");
        setVerifyToken(d.verifyToken || "crmchat-verify");
        setAiReply(d.aiReply !== false);
      })
      .catch(() => {});
  }, []);

  async function toggleAi(next: boolean) {
    setAiReply(next);
    await fetch("/api/integrations/whatsapp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiReply: next }),
    }).catch(() => {});
  }

  async function save() {
    setBusy(true);
    setError("");
    setMsg("");
    const res = await fetch("/api/integrations/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumberId, accessToken, verifyToken }),
    });
    setBusy(false);
    if (res.ok) {
      setConnected(true);
      setHasToken(true);
      setAccessToken("");
      setMsg("Connected ✓");
      setTimeout(() => setMsg(""), 2000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Couldn't save");
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect WhatsApp?")) return;
    setBusy(true);
    await fetch("/api/integrations/whatsapp", { method: "DELETE" });
    setBusy(false);
    setConnected(false);
    setHasToken(false);
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-slate-500"}`} />
        <span className="text-slate-300">{connected ? "Connected" : "Not connected"}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Phone number ID</label>
          <input className={field} value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="From Meta → WhatsApp → API Setup" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Verify token</label>
          <input className={field} value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Access token</label>
        <input className={field} type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder={hasToken ? "•••••••• (leave blank to keep current)" : "Permanent or temporary token"} />
      </div>

      <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <span>
          <span className="block text-sm font-medium text-slate-200">AI auto-reply</span>
          <span className="block text-xs text-slate-400">Answer WhatsApp messages automatically from your knowledge base + FAQs. A request for a human (or a frustrated message) pauses the AI and hands off to your inbox.</span>
        </span>
        <input type="checkbox" checked={aiReply} onChange={(e) => toggleAi(e.target.checked)} className="h-5 w-5 shrink-0 accent-brand-500" />
      </label>

      <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
        In Meta, set the webhook callback URL to:
        <code className="mt-1 block break-all rounded bg-black/30 px-2 py-1 text-brand-300">{origin}/api/webhooks/whatsapp</code>
        and use the same verify token above.
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={busy || !phoneNumberId.trim() || (!accessToken.trim() && !hasToken)} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-50">
          {busy ? "Saving…" : connected ? "Update" : "Save & connect"}
        </button>
        {connected && (
          <button onClick={disconnect} disabled={busy} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5">
            Disconnect
          </button>
        )}
        {msg && <span className="text-sm font-medium text-emerald-400">{msg}</span>}
      </div>
    </div>
  );
}
