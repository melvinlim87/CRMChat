import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";
import { initials, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const [total, won, byStatus, unread, recent] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "WON" } }),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.conversation.aggregate({ _sum: { unreadCount: true } }),
    prisma.conversation.findMany({
      orderBy: { lastMessageAt: "desc" },
      take: 6,
      include: { lead: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const openLeads = total - (statusMap.WON ?? 0) - (statusMap.LOST ?? 0);
  const firstName = (session?.name || "there").split(" ")[0];

  const stats = [
    { label: "Total leads", value: total, accent: "from-brand-300 to-brand-500" },
    { label: "Open pipeline", value: openLeads, accent: "from-brand-200 to-brand-500" },
    { label: "Unread messages", value: unread._sum.unreadCount ?? 0, accent: "from-brand-300 via-brand-400 to-brand-600" },
    { label: "Won", value: won, accent: "from-brand-400 to-brand-700" },
  ];

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="border-b border-white/10 bg-surface-panel px-8 py-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Welcome back, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-slate-400">Here&apos;s what&apos;s happening across your leads today.</p>
      </header>

      <div className="space-y-8 p-8">
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface-panel p-5 shadow-sm">
              <div className={`absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br ${s.accent} opacity-10`} />
              <p className="text-sm font-medium text-slate-400">{s.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Recent conversations */}
          <div className="rounded-2xl border border-white/10 bg-surface-panel">
            <div className="flex items-center justify-between border-b border-white/[5] px-6 py-4">
              <h2 className="font-semibold text-slate-100">Recent conversations</h2>
              <Link href="/chat" className="text-sm font-medium text-brand-300 hover:text-brand-300">
                Open inbox →
              </Link>
            </div>
            <ul className="divide-y divide-white/5">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link href={`/chat?c=${c.id}`} className="flex items-center gap-3 px-6 py-3.5 transition hover:bg-white/5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-300">
                      {initials(c.lead.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate font-medium text-slate-100">{c.lead.name}</p>
                        <span className="text-xs text-slate-500">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      <p className="truncate text-sm text-slate-400">{c.messages[0]?.body ?? "No messages"}</p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-slate-950">
                        {c.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
              {recent.length === 0 && <li className="px-6 py-12 text-center text-slate-500">No conversations yet.</li>}
            </ul>
          </div>

          {/* Pipeline breakdown */}
          <div className="h-fit rounded-2xl border border-white/10 bg-surface-panel p-6">
            <h2 className="mb-4 font-semibold text-slate-100">Pipeline</h2>
            <div className="space-y-3">
              {(["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] as const).map((status) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium text-slate-200">{statusMap[status] ?? 0}</span>
                </div>
              ))}
            </div>
            <Link
              href="/pipeline"
              className="mt-5 block w-full rounded-lg border border-white/10 py-2 text-center text-sm font-medium text-slate-300 transition hover:bg-white/5"
            >
              View pipeline board
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
