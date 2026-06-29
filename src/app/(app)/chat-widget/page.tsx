import WidgetSetup from "@/components/WidgetSetup";

export const dynamic = "force-dynamic";

export default function ChatWidgetPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-white/10 bg-surface-panel px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-100">Chat Widget</h1>
        <p className="text-sm text-slate-400">A plug-and-play AI chat bubble for any website — answers from your knowledge base and captures leads.</p>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <WidgetSetup />
      </div>
    </div>
  );
}
