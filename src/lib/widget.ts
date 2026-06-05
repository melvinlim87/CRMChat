import { prisma } from "./prisma";

export type WidgetConfig = {
  key: string;
  name: string;
  title: string;
  welcome: string;
  color: string;
  instruction: string | null;
  tag: string | null;
};

// The two widgets every workspace starts with.
const DEFAULTS: WidgetConfig[] = [
  {
    key: "public",
    name: "Public (leads)",
    title: "Chat with us",
    welcome: "Hi! 👋 How can I help you today?",
    color: "#cda14a",
    instruction: null,
    tag: "website",
  },
  {
    key: "students",
    name: "Students",
    title: "Student Support",
    welcome: "Hi! 👋 Need help with your course or account?",
    color: "#7c3aed",
    instruction: "You are assisting an existing student of the academy. Be supportive and reference their course where relevant.",
    tag: "student",
  },
];

// Make sure the default widgets exist, then return all widgets.
export async function getAllWidgets(): Promise<WidgetConfig[]> {
  const existing = await prisma.widget.findMany({ orderBy: { createdAt: "asc" } });
  const have = new Set(existing.map((w) => w.key));
  const toCreate = DEFAULTS.filter((d) => !have.has(d.key));
  if (toCreate.length) {
    await prisma.widget.createMany({ data: toCreate });
    return getAllWidgets();
  }
  return existing.map(toConfig);
}

export async function getWidget(key: string): Promise<WidgetConfig> {
  const w = await prisma.widget.findUnique({ where: { key } });
  if (w) return toConfig(w);
  return DEFAULTS.find((d) => d.key === key) ?? DEFAULTS[0];
}

function toConfig(w: {
  key: string; name: string; title: string; welcome: string; color: string; instruction: string | null; tag: string | null;
}): WidgetConfig {
  return { key: w.key, name: w.name, title: w.title, welcome: w.welcome, color: w.color, instruction: w.instruction, tag: w.tag };
}
