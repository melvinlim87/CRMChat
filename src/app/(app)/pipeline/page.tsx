import { prisma } from "@/lib/prisma";
import PipelineBoard, { type BoardLead } from "@/components/PipelineBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const leads = await prisma.lead.findMany({
    orderBy: { updatedAt: "desc" },
    include: { conversation: { select: { id: true } } },
  });

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
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Pipeline</h1>
        <p className="text-sm text-slate-500">Drag leads between stages to update their status.</p>
      </header>
      <div className="min-h-0 flex-1">
        <PipelineBoard leads={board} />
      </div>
    </div>
  );
}
