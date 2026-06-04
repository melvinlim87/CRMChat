import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGoogleStatus } from "@/lib/google";
import { whatsappConfigured } from "@/lib/whatsapp";
import { getAIConfig } from "@/lib/ai";

export const dynamic = "force-dynamic";

type Check = { label: string; done: boolean; required: boolean; detail: string; href: string; cta: string };

export default async function GoLivePage() {
  const [google, waReady, ai, docCount, slack, publishedPages] = await Promise.all([
    getGoogleStatus(),
    whatsappConfigured(),
    getAIConfig(),
    prisma.document.count(),
    prisma.integration.findUnique({ where: { provider: "slack" } }),
    prisma.page.count({ where: { published: true } }),
  ]);

  const aiReady = ai.provider === "ollama" || Boolean(ai.keys[ai.provider]);
  const secretOk = Boolean(process.env.AUTH_SECRET) && process.env.AUTH_SECRET !== "change-me-to-a-long-random-string";

  const checks: Check[] = [
    { label: "Database connected", done: true, required: true, detail: "Your Postgres database is reachable.", href: "/dashboard", cta: "View" },
    { label: "Secure login secret", done: secretOk, required: true, detail: "Set a strong AUTH_SECRET in your environment (openssl rand -base64 32).", href: "#deploy", cta: "How" },
    { label: "AI model connected", done: aiReady, required: true, detail: aiReady ? `Using ${ai.provider} · ${ai.model}.` : "Add a free Groq or Gemini key so AI replies work.", href: "/settings", cta: "Set up" },
    { label: "WhatsApp Business connected", done: waReady, required: false, detail: waReady ? "Cloud API credentials saved." : "Connect the official WhatsApp Cloud API to send/receive.", href: "/integrations", cta: "Connect" },
    { label: "Google connected (Gmail/Calendar/Drive)", done: google.connected, required: false, detail: google.connected ? `Connected${google.email ? ` as ${google.email}` : ""}.` : "Authorize Google for email, calendar and drive.", href: "/integrations", cta: "Connect" },
    { label: "Knowledge base", done: docCount > 0, required: false, detail: docCount > 0 ? `${docCount} document(s) — AI answers from these.` : "Upload PDFs so the AI answers accurately.", href: "/knowledge", cta: "Upload" },
    { label: "Slack notifications", done: slack?.status === "connected", required: false, detail: slack?.status === "connected" ? "New leads ping your Slack." : "Optional: get new-lead alerts in Slack.", href: "/integrations", cta: "Connect" },
    { label: "Website / chat widget", done: publishedPages > 0, required: false, detail: publishedPages > 0 ? `${publishedPages} page(s) published.` : "Publish a page or embed the chat widget on your site.", href: "/chat-widget", cta: "Set up" },
  ];

  const required = checks.filter((c) => c.required);
  const requiredDone = required.filter((c) => c.done).length;
  const readyToLaunch = requiredDone === required.length;

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="border-b border-white/10 bg-surface-panel px-8 py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Go Live 🚀</h1>
        <p className="mt-1 text-sm text-slate-400">Everything you need to take CRMChat live, with real-time status.</p>
      </header>

      <div className="space-y-8 p-8">
        {/* Progress */}
        <div className="max-w-3xl rounded-2xl border border-white/10 bg-surface-panel p-6">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-100">Launch readiness</p>
            <span className={readyToLaunch ? "text-sm font-medium text-emerald-400" : "text-sm font-medium text-slate-400"}>
              {requiredDone}/{required.length} essentials done
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${(requiredDone / required.length) * 100}%` }} />
          </div>
          {readyToLaunch ? (
            <p className="mt-3 text-sm text-emerald-400">✓ Essentials ready — deploy and you&apos;re live!</p>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Complete the required items below, then deploy.</p>
          )}
        </div>

        {/* Checklist */}
        <div className="max-w-3xl space-y-3">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-4 rounded-xl border border-white/10 bg-surface-panel p-4">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${c.done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-500"}`}>
                {c.done ? "✓" : "○"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-100">{c.label}</p>
                  {c.required ? (
                    <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-300">required</span>
                  ) : (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">optional</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-400">{c.detail}</p>
              </div>
              <Link href={c.href} className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/5">
                {c.done ? "Manage" : c.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Deploy guide */}
        <div id="deploy" className="max-w-3xl rounded-2xl border border-white/10 bg-surface-panel p-6">
          <h2 className="font-semibold text-slate-100">Deploy to a public URL</h2>
          <p className="mt-1 text-sm text-slate-400">
            Google OAuth and WhatsApp webhooks need a public HTTPS address — they can&apos;t reach <code className="rounded bg-black/30 px-1">localhost</code>. The free path:
          </p>
          <ol className="mt-4 space-y-2 text-sm text-slate-300">
            <li><span className="font-medium text-brand-300">1.</span> Push this repo to GitHub (already done) and import it into <a className="text-brand-300 underline" href="https://vercel.com/new" target="_blank" rel="noreferrer">Vercel</a>.</li>
            <li><span className="font-medium text-brand-300">2.</span> In Vercel → Settings → Environment Variables, add <code className="rounded bg-black/30 px-1">DATABASE_URL</code> (your Neon URL) and <code className="rounded bg-black/30 px-1">AUTH_SECRET</code> (a long random string).</li>
            <li><span className="font-medium text-brand-300">3.</span> Deploy. You&apos;ll get a URL like <code className="rounded bg-black/30 px-1">https://your-app.vercel.app</code>.</li>
            <li><span className="font-medium text-brand-300">4.</span> <span className="font-medium">Google:</span> in Google Cloud, set the OAuth redirect URI to <code className="rounded bg-black/30 px-1 text-brand-300">https://your-app.vercel.app/api/integrations/google/callback</code>.</li>
            <li><span className="font-medium text-brand-300">5.</span> <span className="font-medium">WhatsApp:</span> in Meta, set the webhook callback to <code className="rounded bg-black/30 px-1 text-brand-300">https://your-app.vercel.app/api/webhooks/whatsapp</code> with your verify token.</li>
            <li><span className="font-medium text-brand-300">6.</span> Run <code className="rounded bg-black/30 px-1">npm run db:push</code> once against your production database. See <code className="rounded bg-black/30 px-1">DEPLOY.md</code> in the repo for the full guide.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
