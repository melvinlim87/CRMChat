import { prisma } from "@/lib/prisma";
import FlowsList from "@/components/FlowsList";

export const dynamic = "force-dynamic";

export default async function FlowsPage() {
  const flows = await prisma.flow.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-900">AI Flows</h1>
        <p className="text-sm text-slate-500">
          Build visual WhatsApp conversations — send messages, branch on what the customer says, and let AI reply.
        </p>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <FlowsList
          initial={flows.map((f) => ({
            id: f.id,
            name: f.name,
            enabled: f.enabled,
            keyword: f.keyword,
            updatedAt: f.updatedAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
