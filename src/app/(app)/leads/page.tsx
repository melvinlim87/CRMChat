import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";
import { initials, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    include: { conversation: true },
  });

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">{leads.length} contacts in your pipeline</p>
        </div>
        <Link
          href="/chat"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Open inbox
        </Link>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Tags</th>
                <th className="px-5 py-3 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link
                      href={lead.conversation ? `/chat?c=${lead.conversation.id}` : "/chat"}
                      className="flex items-center gap-3"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                        {initials(lead.name)}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{lead.name}</p>
                        <p className="text-xs text-slate-400">{lead.email || "—"}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{lead.company || "—"}</td>
                  <td className="px-5 py-3 text-slate-600">{lead.phone || "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.length === 0 && <span className="text-slate-300">—</span>}
                      {lead.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {timeAgo(lead.conversation?.lastMessageAt ?? lead.updatedAt)}
                  </td>
                </tr>
              ))}

              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-400">
                    No leads yet. Connect WhatsApp to start capturing conversations.
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
