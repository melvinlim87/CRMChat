import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGoogleStatus } from "@/lib/google";
import { whatsappConfigured } from "@/lib/whatsapp";
import { getAIConfig, embeddingsAvailable } from "@/lib/ai";

export const dynamic = "force-dynamic";

type Check = { label: string; done: boolean; required: boolean; detail: string; href: string; cta: string };

export default async function GoLivePage() {
  const [google, waReady, ai, docCount, faqCount, semantic, slack] = await Promise.all([
    getGoogleStatus(),
    whatsappConfigured(),
    getAIConfig(),
    prisma.document.count(),
    prisma.faq.count(),
    embeddingsAvailable(),
    prisma.integration.findUnique({ where: { provider: "slack" } }),
  ]);

  const aiReady = ai.provider === "ollama" || Boolean(ai.keys[ai.provider]);
  const knowledgeReady = docCount > 0 || faqCount > 0;

  const checks: Check[] = [
    { label: "Database connected", done: true, required: true, detail: "Your Postgres database is reachable.", href: "/chat-widget", cta: "View" },
    { label: "AI model connected", done: aiReady, required: true, detail: aiReady ? `Using ${ai.provider} · ${ai.model} (auto-falls back to other connected providers).` : "Add a free Groq or Gemini key so AI replies work.", href: "/settings", cta: "Set up" },
    { label: "Knowledge base", done: knowledgeReady, required: true, detail: knowledgeReady ? `${docCount} document(s) + ${faqCount} FAQ(s) — the AI answers from these.` : "Upload a PDF/HTML/text doc or add FAQs so the AI can answer.", href: "/chat-widget", cta: "Add" },
    { label: "Semantic search (embeddings)", done: semantic, required: false, detail: semantic ? "On — answers find the right section by meaning." : "Optional: add an OpenAI or Gemini key to enable it (keyword search used otherwise).", href: "/settings", cta: "Enable" },
    { label: "Chat widget embedded", done: false, required: true, detail: "Copy the embed snippet from the Chat Widget page into your website.", href: "/chat-widget", cta: "Get code" },
    { label: "Protect the admin", done: false, required: true, detail: "Login is currently OFF — anyone with the URL can open the admin. Add protection before going public.", href: "#deploy", cta: "How" },
    { label: "WhatsApp Business connected", done: waReady, required: false, detail: waReady ? "Cloud API credentials saved — AI auto-reply available." : "Optional: connect WhatsApp so the AI answers there too.", href: "/integrations", cta: "Connect" },
    { label: "Google connected (Gmail/Calendar/Drive)", done: google.connected, required: false, detail: google.connected ? `Connected${google.email ? ` as ${google.email}` : ""}.` : "Optional: authorize Google.", href: "/integrations", cta: "Connect" },
    { label: "Slack notifications", done: slack?.status === "connected", required: false, detail: slack?.status === "connected" ? "New leads ping your Slack." : "Optional: get new-lead alerts in Slack.", href: "/integrations", cta: "Connect" },
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
