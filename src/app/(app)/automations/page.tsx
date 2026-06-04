import { prisma } from "@/lib/prisma";
import AutomationsList from "@/components/AutomationsList";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const automations = await prisma.automation.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-white/10 bg-surface-panel px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-100">Automations</h1>
        <p className="text-sm text-slate-400">Build n8n-style workflows — a trigger event runs a chain of action nodes.</p>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <AutomationsList
          initial={automations.map((a) => ({ id: a.id, name: a.name, enabled: a.enabled, trigger: a.trigger }))}
        />
      </div>
    </div>
  );
}
