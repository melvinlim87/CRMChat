"use client";

import { useState } from "react";

type FormData = { heading?: string; subtext?: string; buttonLabel?: string; successMessage?: string };

export default function PublicForm({ slug, data }: { slug: string; data: FormData }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const field =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-500";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const res = await fetch("/api/forms/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, ...form }),
    });
    if (res.ok) {
      setStatus("done");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        {data.heading && <h3 className="font-display text-2xl font-semibold text-slate-100">{data.heading}</h3>}
        {data.subtext && <p className="mt-1 text-sm text-slate-400">{data.subtext}</p>}

        {status === "done" ? (
          <p className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {data.successMessage || "Thank you! We'll be in touch."}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <input className={field} placeholder="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={field} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={field} placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <textarea className={field} rows={3} placeholder="Message (optional)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={status === "sending" || !form.name.trim() || (!form.email.trim() && !form.phone.trim())}
              className="w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : data.buttonLabel || "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
