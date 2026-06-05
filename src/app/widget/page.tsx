import WidgetChat from "@/components/WidgetChat";
import { getWidget } from "@/lib/widget";

export const dynamic = "force-dynamic";

// Public chat UI, embedded via an iframe by widget.js. ?w=<key> picks the widget.
export default async function WidgetPage({ searchParams }: { searchParams: { w?: string } }) {
  const config = await getWidget(searchParams.w || "public");
  return (
    <div className="h-screen">
      <WidgetChat config={config} widgetKey={config.key} />
    </div>
  );
}
