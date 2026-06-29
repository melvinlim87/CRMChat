import ConnectGoogle from "@/components/ConnectGoogle";
import ComposeEmail from "@/components/ComposeEmail";
import { getGoogleStatus, getValidGoogleToken, googleConfigured, listRecentEmails } from "@/lib/google";
import { initials, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].replace(/"/g, "").trim() || match[2], email: match[2] };
  return { name: from, email: from };
}

export default async function GmailPage() {
  const status = await getGoogleStatus();
  if (!status.connected) return <ConnectGoogle service="Gmail" configured={googleConfigured()} />;

  const token = await getValidGoogleToken();
  const emails = token ? await listRecentEmails(token) : [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-white/10 bg-surface-panel px-8 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Gmail</h1>
          <p className="text-sm text-slate-400">Recent inbox{status.email ? ` · ${status.email}` : ""}</p>
        </div>
        <ComposeEmail />
      </header>

      <div className="flex-1 overflow-auto">
        <ul className="divide-y divide-white/5">
          {emails.map((m) => {
            const sender = parseSender(m.from);
            return (
              <li key={m.id} className="flex items-start gap-3 bg-surface-panel px-8 py-4 transition hover:bg-white/5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-semibold text-red-300">
                  {initials(sender.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-slate-100">{sender.name}</p>
                    <span className="shrink-0 text-xs text-slate-500">
                      {m.date ? timeAgo(new Date(m.date)) : ""}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-slate-200">{m.subject}</p>
                  <p className="truncate text-sm text-slate-500">{m.snippet}</p>
                </div>
              </li>
            );
          })}
          {emails.length === 0 && (
            <li className="px-8 py-16 text-center text-slate-500">No emails to show.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
