import { notFound } from "next/navigation";
import dynamicImport from "next/dynamic";
import { prisma } from "@/lib/prisma";
import type { AutomationData } from "@/components/AutomationEditor";

export const dynamic = "force-dynamic";

const AutomationEditor = dynamicImport(() => import("@/components/AutomationEditor"), {
  ssr: false,
  loading: () => <div className="p-8 text-sm text-slate-500">Loading editor…</div>,
});

export default async function AutomationEditorPage({ params }: { params: { id: string } }) {
  const a = await prisma.automation.findUnique({ where: { id: params.id } });
  if (!a) notFound();

  const data: AutomationData = {
    id: a.id,
    name: a.name,
    enabled: a.enabled,
    trigger: a.trigger,
    graph: a.graph as AutomationData["graph"],
  };
  return <AutomationEditor automation={data} />;
}
