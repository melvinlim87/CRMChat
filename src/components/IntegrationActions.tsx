"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Provider = "whatsapp" | "slack" | "comingsoon";

export default function IntegrationActions({
  provider,
  name,
  connected,
}: {
  provider: Provider;
  name: string;
  connected: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("crmchat-verify");
  const [webhookUrl, setWebhookUrl] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function save(path: string, body: object) {
    setBusy(true);
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        router.refresh();
      }, 900);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Something went wrong");
    }
  }

  async function disconnect(path: string) {
    setBusy(true);
    await fetch(path, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  const brandBtn =
    "rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50";
  const outlineBtn =
    "rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5";
  const field =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

  // --- Coming soon providers ---
  if (provider === "comingsoon") {
    return (
      <>
        <button onClick={() => setOpen(true)} className={`mt-4 w-full ${outlineBtn}`}>
          Request access
        </button>
        {open && (
          <Modal title={`${name} — coming soon`} onClose={() => setOpen(false)}>
            <p className="text-sm text-slate-300">
              {name} integration is on the roadmap. We&apos;ll surface it here as soon as it&apos;s ready.
            </p>
            <div className="mt-5 flex justify-end">
              <button onClick={() => setOpen(false)} className={brandBtn}>
                Got it
              </button>
            </div>
          </Modal>
        )}
      </>
    );
  }

  return (
    <>
      {connected ? (
        <div className="mt-4 flex flex-col gap-2">
          <button onClick={() => setOpen(true)} className={`w-full ${brandBtn}`}>
            Manage
          </button>
          <button
            onClick={() => disconnect(`/api/integrations/${provider}`)}
            disabled={busy}
            className={`w-full ${outlineBtn}`}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className={`mt-4 w-full ${brandBtn}`}>
          Connect
        </button>
      )}

      {open && provider === "whatsapp" && (
        <Modal title="Connect WhatsApp Business" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Labeled label="Phone number ID">
              <input className={field} value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="From Meta → WhatsApp → API Setup" />
            </Labeled>
            <Labeled label="Access token">
              <input className={field} type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Permanent or temporary token" />
            </Labeled>
            <Labeled label="Verify token">
              <input className={field} value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} />
            </Labeled>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
              In Meta, set the webhook callback URL to:
              <code className="mt-1 block break-all rounded bg-black/30 px-2 py-1 text-brand-300">
                {origin}/api/webhooks/whatsapp
              </code>
              and use the same verify token above.
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className={outlineBtn}>Cancel</button>
            <button
              onClick={() => save("/api/integrations/whatsapp", { phoneNumberId, accessToken, verifyToken })}
              disabled={busy || done || !phoneNumberId.trim() || !accessToken.trim()}
              className={brandBtn}
            >
              {done ? "Saved ✓" : busy ? "Saving…" : "Save & connect"}
            </button>
          </div>
        </Modal>
      )}

      {open && provider === "slack" && (
        <Modal title="Connect Slack" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Labeled label="Incoming webhook URL">
              <input className={field} value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/services/…" />
            </Labeled>
            <p className="text-xs text-slate-400">
              Create one at{" "}
              <a className="text-brand-300 underline" href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer">
                api.slack.com/messaging/webhooks
              </a>
              . We&apos;ll send a test message to confirm it works.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className={outlineBtn}>Cancel</button>
            <button
              onClick={() => save("/api/integrations/slack", { webhookUrl })}
              disabled={busy || done || !webhookUrl.trim()}
              className={brandBtn}
            >
              {done ? "Connected ✓" : busy ? "Testing…" : "Save & connect"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="glass w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}
