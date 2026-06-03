import ConnectGoogle from "@/components/ConnectGoogle";
import { getGoogleStatus, getValidGoogleToken, googleConfigured, listRecentFiles } from "@/lib/google";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

function fileKind(mimeType: string): string {
  if (mimeType.includes("folder")) return "Folder";
  if (mimeType.includes("document")) return "Doc";
  if (mimeType.includes("spreadsheet")) return "Sheet";
  if (mimeType.includes("presentation")) return "Slides";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  return mimeType.split("/").pop()?.toUpperCase() ?? "File";
}

export default async function DrivePage() {
  const status = await getGoogleStatus();
  if (!status.connected) return <ConnectGoogle service="Drive" configured={googleConfigured()} />;

  const token = await getValidGoogleToken();
  const files = token ? await listRecentFiles(token) : [];

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-white/10 bg-surface-panel px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-100">Drive</h1>
        <p className="text-sm text-slate-400">Recent files{status.email ? ` · ${status.email}` : ""}</p>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {files.map((f) => (
                <tr key={f.id} className="transition hover:bg-white/5">
                  <td className="px-5 py-3">
                    <a
                      href={f.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-slate-100 hover:text-brand-300"
                    >
                      {f.name}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{fileKind(f.mimeType)}</td>
                  <td className="px-5 py-3 text-slate-400">
                    {f.modifiedTime ? timeAgo(new Date(f.modifiedTime)) : "—"}
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-16 text-center text-slate-500">
                    No files to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
