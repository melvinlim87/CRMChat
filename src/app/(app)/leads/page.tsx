import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";
import OwnerSelect from "@/components/OwnerSelect";
import OwnerFilter from "@/components/OwnerFilter";
import { initials, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { owner?: string };
}) {
  const ownerFilter =
    searchParams.owner === "unassigned"
      ? { ownerId: null }
      : searchParams.owner
        ? { ownerId: searchParams.owner }
        : {};

  const [leads, users] = await Promise.all([
    prisma.lead.findMany({
      where: ownerFilter,
      orderBy: { updatedAt: "desc" },
      include: { conversation: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-white/10 bg-surface-panel px-8 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Leads</h1>
          <p className="text-sm text-slate-400">{leads.length} contacts in your pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <OwnerFilter users={users} />
          <Link
            href="/chat"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Open inbox
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-surface-panel">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Owner</th>
                <th className="px-5 py-3 font-medium">Tags</th>
                <th className="px-5 py-3 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((lead) => (
                <tr key={lead.id} className="transition hover:bg-white/5">
                  <td className="px-5 py-3">
                    <Link
                      href={lead.conversation ? `/chat?c=${lead.conversation.id}` : "/chat"}
                      className="flex items-center gap-3"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-300">
                        {initials(lead.name)}
                      </span>
                      <div>
                        <p className="font-medium text-slate-100">{lead.name}</p>
                        <p className="text-xs text-slate-500">{lead.phone || lead.email || "—"}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{lead.company || "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-5 py-3">
                    <OwnerSelect leadId={lead.id} ownerId={lead.ownerId} users={users} compact />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.length === 0 && <span className="text-slate-600">—</span>}
                      {lead.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-white/10 px-1.5 py-0.5 text-xs text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {timeAgo(lead.conversation?.lastMessageAt ?? lead.updatedAt)}
                  </td>
                </tr>
              ))}

              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-slate-500">
                    No leads found.
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
