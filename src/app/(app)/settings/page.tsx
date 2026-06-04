import AISettingsForm from "@/components/AISettingsForm";
import QuickReplies from "@/components/QuickReplies";
import TeamMembers from "@/components/TeamMembers";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-white/10 bg-surface-panel px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400">Configure AI models, quick replies, and more.</p>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl space-y-6">
          <AISettingsForm />
          <TeamMembers />
          <QuickReplies />
        </div>
      </div>
    </div>
  );
}
