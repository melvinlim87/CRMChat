import { prisma } from "./prisma";

export type WidgetConfig = { title: string; welcome: string; color: string };

export const DEFAULT_WIDGET: WidgetConfig = {
  title: "Chat with us",
  welcome: "Hi! 👋 How can I help you today?",
  color: "#cda14a",
};

export async function getWidgetConfig(): Promise<WidgetConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "widget" } });
  return { ...DEFAULT_WIDGET, ...((row?.value as Partial<WidgetConfig>) ?? {}) };
}
