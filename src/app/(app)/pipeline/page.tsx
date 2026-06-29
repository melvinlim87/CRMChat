import { prisma } from "@/lib/prisma";
import PipelineBoard, { type BoardLead } from "@/components/PipelineBoard";
import NewLead from "@/components/NewLead";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [leads, users] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { updatedAt: "desc" },
      include: { conversation: { select: { id: true } } },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);

  const board: BoardLead[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    status: l.status,
    tags: l.tags,
    conversationId: l.conversation?.id ?? null,
  }));

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-white/10 bg-surface-panel px-8 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Pipeline</h1>
          <p className="text-sm text-slate-400">Drag students between stages to update their status.</p>
        </div>
        <NewLead users={users} />
      </header>
      <div className="min-h-0 flex-1">
        <PipelineBoard leads={board} />
      </div>
    </div>
  );
}
