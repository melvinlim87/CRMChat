import AISettingsForm from "@/components/AISettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Configure the AI models that power replies and flows.</p>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <AISettingsForm />
      </div>
    </div>
  );
}
