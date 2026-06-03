import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGoogleStatus, googleConfigured } from "@/lib/google";
import GoogleDisconnect from "@/components/GoogleDisconnect";

export const dynamic = "force-dynamic";

type Service = {
  key: string;
  name: string;
  desc: string;
  color: string;
  provider: "whatsapp" | "google" | "stub";
  href?: string;
};

const SERVICES: Service[] = [
  { key: "whatsapp", name: "WhatsApp Business", desc: "Receive and reply to leads via the official Cloud API.", color: "bg-green-500", provider: "whatsapp" },
  { key: "gmail", name: "Gmail", desc: "Sync recent emails into your workspace.", color: "bg-red-500", provider: "google", href: "/gmail" },
  { key: "calendar", name: "Google Calendar", desc: "See upcoming events alongside your leads.", color: "bg-blue-500", provider: "google", href: "/calendar" },
  { key: "drive", name: "Google Drive", desc: "Browse recent files without leaving CRMChat.", color: "bg-yellow-500", provider: "google", href: "/drive" },
  { key: "instagram", name: "Instagram DMs", desc: "Capture Instagram direct messages as leads.", color: "bg-pink-500", provider: "stub" },
  { key: "slack", name: "Slack", desc: "Get notified about new leads in Slack.", color: "bg-violet-500", provider: "stub" },
];

const ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google OAuth isn't configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
  invalid_state: "Couldn't verify the Google sign-in request. Please try again.",
  google_exchange_failed: "Google sign-in failed during token exchange. Please try again.",
  access_denied: "Google access was denied.",
};

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const integrations = await prisma.integration.findMany();
  const byProvider = new Map(integrations.map((i) => [i.provider, i]));
  const whatsappConnected =
    Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) ||
    byProvider.get("whatsapp")?.status === "connected";
  const google = await getGoogleStatus();
  const googleReady = googleConfigured();

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-500">Connect your channels and tools to capture everything in one place.</p>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {searchParams.connected === "google" && (
          <div className="mb-6 max-w-3xl rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Google connected{google.email ? ` as ${google.email}` : ""}. Gmail, Calendar, and Drive are ready.
          </div>
        )}
        {searchParams.error && (
          <div className="mb-6 max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ERROR_MESSAGES[searchParams.error] || "Something went wrong connecting that service."}
          </div>
        )}

        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          {SERVICES.map((s) => {
            const connected =
              s.provider === "whatsapp"
                ? whatsappConnected
                : s.provider === "google"
                  ? google.connected
                  : byProvider.get(s.key)?.status === "connected";

            return (
              <div key={s.key} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color} text-sm font-bold text-white`}>
                    {s.name.slice(0, 1)}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{s.name}</p>
                    <span className={connected ? "text-xs font-medium text-emerald-600" : "text-xs font-medium text-slate-400"}>
                      {connected ? (s.provider === "google" && google.email ? google.email : "Connected") : "Not connected"}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">{s.desc}</p>

                {s.provider === "google" ? (
                  connected ? (
                    <div className="mt-4 flex flex-col gap-2">
                      {s.href && (
                        <Link
                          href={s.href}
                          className="w-full rounded-lg bg-brand-500 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-600"
                        >
                          Open {s.name}
                        </Link>
                      )}
                      <GoogleDisconnect />
                    </div>
                  ) : googleReady ? (
                    <a
                      href="/api/integrations/google/start"
                      className="mt-4 block w-full rounded-lg bg-brand-500 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-600"
                    >
                      Connect Google
                    </a>
                  ) : (
                    <button
                      disabled
                      className="mt-4 w-full cursor-not-allowed rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-400"
                    >
                      Configure to connect
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {connected ? "Manage" : "Connect"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-medium">Setting up Google (Gmail, Calendar, Drive)</p>
          <p className="mt-1">
            Create an OAuth client in the{" "}
            <a className="underline" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
              Google Cloud Console
            </a>
            , add <code className="rounded bg-amber-100 px-1">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="rounded bg-amber-100 px-1">GOOGLE_CLIENT_SECRET</code> to your environment, and set the
            redirect URI to <code className="rounded bg-amber-100 px-1">/api/integrations/google/callback</code>. See the
            README for the full guide.
          </p>
        </div>
      </div>
    </div>
  );
}
