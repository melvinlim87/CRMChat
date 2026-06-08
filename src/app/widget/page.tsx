import WidgetChat from "@/components/WidgetChat";
import { getWidget } from "@/lib/widget";

export const dynamic = "force-dynamic";

// Public chat UI, embedded via an iframe by widget.js.
//   ?w=<key>      picks the widget (e.g. "students" for the student-only embed)
//   ?theme=dark   renders the dark theme (to sit inside a dark site)
//   default/"public" shows the unified entry that first asks who they are.
export default async function WidgetPage({ searchParams }: { searchParams: { w?: string; theme?: string } }) {
  const key = searchParams.w || "public";
  const config = await getWidget(key);
  const theme = searchParams.theme === "dark" ? "dark" : "light";

  // The intro "Are you a student?" flow is toggled per-widget in the admin.
  const gated = config.gateEnabled;
  const studentConfig = gated ? await getWidget("students") : undefined;

  return (
    <div className="h-screen">
      <WidgetChat config={config} widgetKey={config.key} studentConfig={studentConfig} gate={gated} theme={theme} />
    </div>
  );
}
