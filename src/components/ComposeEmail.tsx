"use client";

import { useState } from "react";

export default function ComposeEmail() {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    setSending(true);
    setError(null);
    const res = await fetch("/api/integrations/google/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body }),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setTo("");
        setSubject("");
        setBody("");
      }, 1000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to send");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
      >
        Compose
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface-panel p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">New email</h3>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="To"
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message…"
                rows={7}
                className="w-full resize-none rounded-lg border border-white/10 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={sending || sent || !to.trim() || !body.trim()}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {sent ? "Sent ✓" : sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
