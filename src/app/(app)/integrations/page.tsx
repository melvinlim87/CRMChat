import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SERVICES = [
  { provider: "whatsapp", name: "WhatsApp Business", desc: "Receive and reply to leads via the official Cloud API.", color: "bg-green-500" },
  { provider: "gmail", name: "Gmail", desc: "Sync email conversations into your inbox.", color: "bg-red-500" },
  { provider: "instagram", name: "Instagram DMs", desc: "Capture Instagram direct messages as leads.", color: "bg-pink-500" },
  { provider: "slack", name: "Slack", desc: "Get notified about new leads in Slack.", color: "bg-violet-500" },
];

export default async function IntegrationsPage() {
  const integrations = await prisma.integration.findMany();
  const byProvider = new Map(integrations.map((i) => [i.provider, i]));
  const whatsappEnvConfigured = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-500">Connect your channels to capture every lead in one inbox.</p>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          {SERVICES.map((s) => {
            const record = byProvider.get(s.provider);
            const connected =
              s.provider === "whatsapp"
                ? whatsappEnvConfigured || record?.status === "connected"
                : record?.status === "connected";

            return (
              <div key={s.provider} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color} text-sm font-bold text-white`}>
                      {s.name.slice(0, 1)}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">{s.name}</p>
                      <span
                        className={
                          connected
                            ? "text-xs font-medium text-emerald-600"
                            : "text-xs font-medium text-slate-400"
                        }
                      >
                        {connected ? "Connected" : "Not connected"}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">{s.desc}</p>
                <button
                  disabled
                  className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {connected ? "Manage" : "Connect"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-medium">Setting up WhatsApp</p>
          <p className="mt-1">
            Add your <code className="rounded bg-amber-100 px-1">WHATSAPP_PHONE_NUMBER_ID</code> and{" "}
            <code className="rounded bg-amber-100 px-1">WHATSAPP_ACCESS_TOKEN</code> to your environment, then point your
            Meta webhook to <code className="rounded bg-amber-100 px-1">/api/webhooks/whatsapp</code> using your verify
            token. See the README for the full guide.
          </p>
        </div>
      </div>
    </div>
  );
}
