import WidgetChat from "@/components/WidgetChat";
import { getWidget } from "@/lib/widget";

export const dynamic = "force-dynamic";

// Public chat UI, embedded via an iframe by widget.js.
//   ?w=<key>   picks the widget (e.g. "students" for the student-only embed)
//   default/"public" shows the unified entry that first asks "Are you a student?"
export default async function WidgetPage({ searchParams }: { searchParams: { w?: string } }) {
  const key = searchParams.w || "public";
  const config = await getWidget(key);

  // The public widget is the unified front door: it gates students through a
  // quick email sign-in, while visitors chat straight away.
  const gated = key === "public";
  const studentConfig = gated ? await getWidget("students") : undefined;

  return (
    <div className="h-screen">
      <WidgetChat config={config} widgetKey={config.key} studentConfig={studentConfig} gate={gated} />
    </div>
  );
}
