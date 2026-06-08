import FaqManager from "@/components/FaqManager";

export const dynamic = "force-dynamic";

export default function FaqPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-white/10 bg-surface-panel px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-100">FAQs</h1>
        <p className="text-sm text-slate-400">Questions and answers your AI assistant uses to help visitors — and that you can show on your site.</p>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <FaqManager />
      </div>
    </div>
  );
}
