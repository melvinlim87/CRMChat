import WidgetChat from "@/components/WidgetChat";
import { getWidgetConfig } from "@/lib/widget";

export const dynamic = "force-dynamic";

// Public chat UI, embedded via an iframe by widget.js. No app chrome.
export default async function WidgetPage() {
  const config = await getWidgetConfig();
  return (
    <div className="h-screen">
      <WidgetChat config={config} />
    </div>
  );
}
