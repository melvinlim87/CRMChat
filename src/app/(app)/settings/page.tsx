import AISettingsForm from "@/components/AISettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-white/10 bg-surface-panel px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400">Configure the AI models that power replies and flows.</p>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <AISettingsForm />
      </div>
    </div>
  );
}
