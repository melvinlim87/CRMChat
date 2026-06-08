import WidgetFlowBuilder, { type FlowWidget } from "@/components/WidgetFlowBuilder";
import { getWidget } from "@/lib/widget";

export const dynamic = "force-dynamic";

export default async function WidgetFlowPage({ params }: { params: { key: string } }) {
  const config = await getWidget(params.key);
  return (
    <div className="h-full">
      <WidgetFlowBuilder widget={config as unknown as FlowWidget} />
    </div>
  );
}
