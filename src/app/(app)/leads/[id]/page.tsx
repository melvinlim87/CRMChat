import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StudentProfile from "@/components/StudentProfile";
import NotesPanel from "@/components/NotesPanel";
import StatusBadge from "@/components/StatusBadge";
import { initials, clockTime, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const [lead, users] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        conversation: { include: { messages: { orderBy: { createdAt: "desc" }, take: 8 } } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);
  if (!lead) notFound();

  const messages = lead.conversation?.messages ?? [];

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="flex items-center justify-between border-b border-white/10 bg-surface-panel px-8 py-5">
        <div className="flex items-center gap-3">
          <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-200">← Students</Link>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/20 text-sm font-semibold text-brand-300">
            {initials(lead.name)}
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-100">{lead.name}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <StatusBadge status={lead.status} />
              {lead.company && <span>· {lead.company}</span>}
            </div>
          </div>
        </div>
        {lead.conversation && (
          <Link href={`/chat?c=${lead.conversation.id}`} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600">
            Open chat
          </Link>
        )}
      </header>

      <div className="grid flex-1 gap-6 p-8 lg:grid-cols-[1fr_340px]">
        <StudentProfile
          lead={{ id: lead.id, name: lead.name, email: lead.email, phone: lead.phone, company: lead.company, status: lead.status, tags: lead.tags, ownerId: lead.ownerId }}
          users={users}
        />

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
            <NotesPanel leadId={lead.id} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-surface-panel p-6">
            <h2 className="mb-3 font-semibold text-slate-100">Recent activity</h2>
            <ul className="space-y-2">
              {messages.map((m) => (
                <li key={m.id} className="text-sm">
                  <span className={m.direction === "INBOUND" ? "text-slate-300" : "text-brand-300"}>
                    {m.direction === "INBOUND" ? "← " : "→ "}
                  </span>
                  <span className="text-slate-300">{m.body}</span>
                  <span className="ml-1 text-[11px] text-slate-500">· {timeAgo(m.createdAt)} {clockTime(m.createdAt)}</span>
                </li>
              ))}
              {messages.length === 0 && <li className="text-sm text-slate-500">No messages yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
