import { prisma } from "./prisma";

export type WidgetConfig = {
  key: string;
  name: string;
  title: string;
  welcome: string;
  color: string;
  instruction: string | null;
  tag: string | null;
  starters: string[];
  avatar: string | null;
  tone: string;
  flowEnabled: boolean;
  flow: WidgetFlow;
  gateEnabled: boolean;
  gateHeading: string;
  studentLabel: string;
  visitorLabel: string;
};

export type WidgetFlow = { nodes?: any[]; edges?: any[] };

// AI tone presets → guidance appended to the system prompt.
export const TONES: { key: string; label: string; guidance: string }[] = [
  { key: "friendly", label: "Friendly", guidance: "Keep a warm, friendly, approachable tone." },
  { key: "professional", label: "Professional", guidance: "Keep a polished, professional, businesslike tone." },
  { key: "casual", label: "Casual", guidance: "Keep a relaxed, casual, conversational tone — like texting a friend." },
  { key: "enthusiastic", label: "Enthusiastic", guidance: "Be upbeat, positive and enthusiastic." },
  { key: "empathetic", label: "Empathetic", guidance: "Be especially warm, patient and empathetic." },
  { key: "concise", label: "Concise", guidance: "Be brief and to the point — minimal words, no fluff." },
];

export function toneGuidance(tone?: string): string {
  return (TONES.find((t) => t.key === tone) ?? TONES[0]).guidance;
}

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
    starters: ["What do you offer?", "How do I get started?", "Pricing & plans"],
    avatar: null,
    tone: "friendly",
    flowEnabled: false,
    flow: {},
    gateEnabled: true,
    gateHeading: "Welcome! How can we help?",
    studentLabel: "🎓 Existing Student",
    visitorLabel: "💬 General Enquiry",
  },
  {
    key: "students",
    name: "Students",
    title: "Student Support",
    welcome: "Hi! 👋 Need help with your course or account?",
    color: "#7c3aed",
    instruction: "You are assisting an existing student of the academy. Be supportive and reference their course where relevant.",
    tag: "student",
    starters: ["Help with my account", "Where are my course materials?", "Payment & billing"],
    avatar: null,
    tone: "friendly",
    flowEnabled: false,
    flow: {},
    gateEnabled: false,
    gateHeading: "Welcome! How can we help?",
    studentLabel: "🎓 Existing Student",
    visitorLabel: "💬 General Enquiry",
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
  starters?: string[]; avatar?: string | null; tone?: string; flowEnabled?: boolean; flow?: unknown;
  gateEnabled?: boolean; gateHeading?: string; studentLabel?: string; visitorLabel?: string;
}): WidgetConfig {
  return {
    key: w.key, name: w.name, title: w.title, welcome: w.welcome, color: w.color, instruction: w.instruction, tag: w.tag,
    starters: w.starters ?? [],
    avatar: w.avatar ?? null,
    tone: w.tone ?? "friendly",
    flowEnabled: w.flowEnabled ?? false,
    flow: (w.flow && typeof w.flow === "object" ? (w.flow as WidgetFlow) : {}) || {},
    gateEnabled: w.gateEnabled ?? false,
    gateHeading: w.gateHeading ?? "Welcome! How can we help?",
    studentLabel: w.studentLabel ?? "🎓 Existing Student",
    visitorLabel: w.visitorLabel ?? "💬 General Enquiry",
  };
}
