import { prisma } from "@/lib/prisma";
import AutomationsManager from "@/components/AutomationsManager";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const automations = await prisma.automation.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Automations</h1>
        <p className="text-sm text-slate-500">
          Automatically reply, tag, or update leads when a WhatsApp message arrives.
        </p>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <AutomationsManager initial={automations} />
      </div>
    </div>
  );
}
