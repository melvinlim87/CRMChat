import { notFound } from "next/navigation";
import dynamicImport from "next/dynamic";
import { prisma } from "@/lib/prisma";
import type { FlowData } from "@/components/FlowEditor";

export const dynamic = "force-dynamic";

// React Flow needs the browser; load the editor client-side only.
const FlowEditor = dynamicImport(() => import("@/components/FlowEditor"), {
  ssr: false,
  loading: () => <div className="p-8 text-sm text-slate-400">Loading editor…</div>,
});

export default async function FlowEditorPage({ params }: { params: { id: string } }) {
  const flow = await prisma.flow.findUnique({ where: { id: params.id } });
  if (!flow) notFound();

  const data: FlowData = {
    id: flow.id,
    name: flow.name,
    enabled: flow.enabled,
    keyword: flow.keyword,
    graph: flow.graph as FlowData["graph"],
  };

  return <FlowEditor flow={data} />;
}
