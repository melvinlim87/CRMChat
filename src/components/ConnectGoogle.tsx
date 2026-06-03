export default function ConnectGoogle({
  service,
  configured,
}: {
  service: string;
  configured: boolean;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm rounded-2xl border border-white/10 bg-surface-panel p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-xl">
          🔗
        </div>
        <h2 className="text-lg font-semibold text-slate-100">Connect Google to use {service}</h2>
        <p className="mt-2 text-sm text-slate-400">
          Authorize your Google account once to unlock Gmail, Calendar, and Drive across CRMChat.
        </p>

        {configured ? (
          <a
            href="/api/integrations/google/start"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Connect Google
          </a>
        ) : (
          <p className="mt-6 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Google OAuth isn&apos;t configured yet. Add <code>GOOGLE_CLIENT_ID</code> and{" "}
            <code>GOOGLE_CLIENT_SECRET</code> to your environment (see README).
          </p>
        )}
      </div>
    </div>
  );
}
