import KnowledgeBase from "@/components/KnowledgeBase";

export const dynamic = "force-dynamic";

export default function KnowledgePage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-white/10 bg-surface-panel px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-100">Knowledge Base</h1>
        <p className="text-sm text-slate-400">Upload PDFs — your AI uses them as context when drafting replies and running flows.</p>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <KnowledgeBase />
      </div>
    </div>
  );
}
