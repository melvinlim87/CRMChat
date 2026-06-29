// Prebuilt AI-flow templates. Each builds a ready-to-edit node graph so users
// can create a working flow in one click, then customize it.

type Node = { id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> };
type Edge = { id: string; source: string; target: string; sourceHandle?: string | null };
type Graph = { nodes: Node[]; edges: Edge[] };

export type TemplateKey = "blank" | "customer-service" | "lead-qualification" | "appointment";

export const TEMPLATES: { key: TemplateKey; label: string; icon: string; description: string }[] = [
  { key: "customer-service", label: "Customer Service", icon: "🎧", description: "Greet, route by topic, and let AI handle the rest." },
  { key: "lead-qualification", label: "Lead Qualification", icon: "🎯", description: "Ask qualifying questions, tag and score the lead." },
  { key: "appointment", label: "Appointment Booking", icon: "📅", description: "Offer a booking link when the customer says yes." },
  { key: "blank", label: "Blank Flow", icon: "✨", description: "Start from scratch with just a trigger." },
];

export function buildTemplate(key: TemplateKey): { name: string; keyword: string | null; graph: Graph } {
  const trigger: Node = { id: "trigger", type: "trigger", position: { x: 260, y: 20 }, data: {} };

  if (key === "customer-service") {
    return {
      name: "Customer Service",
      keyword: null,
      graph: {
        nodes: [
          trigger,
          { id: "s1", type: "send", position: { x: 220, y: 130 }, data: { message: "Hi! 👋 Thanks for contacting us. How can we help — billing, technical support, or something else?" } },
          { id: "w1", type: "wait", position: { x: 260, y: 280 }, data: {} },
          { id: "c1", type: "condition", position: { x: 250, y: 390 }, data: { keyword: "billing" } },
          { id: "s2", type: "send", position: { x: 40, y: 520 }, data: { message: "For billing questions, your invoices live in your account dashboard. What specifically can I help with?" } },
          { id: "ai1", type: "ai", position: { x: 430, y: 520 }, data: { instruction: "Answer the customer's support question helpfully and concisely." } },
        ],
        edges: [
          { id: "e1", source: "trigger", target: "s1", sourceHandle: "out" },
          { id: "e2", source: "s1", target: "w1", sourceHandle: "out" },
          { id: "e3", source: "w1", target: "c1", sourceHandle: "out" },
          { id: "e4", source: "c1", target: "s2", sourceHandle: "match" },
          { id: "e5", source: "c1", target: "ai1", sourceHandle: "else" },
        ],
      },
    };
  }

  if (key === "lead-qualification") {
    return {
      name: "Lead Qualification",
      keyword: null,
      graph: {
        nodes: [
          trigger,
          { id: "s1", type: "send", position: { x: 220, y: 130 }, data: { message: "Thanks for your interest! 🎉 To tailor things for you, what's your rough budget?" } },
          { id: "w1", type: "wait", position: { x: 260, y: 280 }, data: {} },
          { id: "ai1", type: "ai", position: { x: 220, y: 390 }, data: { instruction: "Acknowledge their budget warmly and ask about their timeline." } },
          { id: "t1", type: "tag", position: { x: 230, y: 520 }, data: { tag: "qualified-lead" } },
          { id: "st1", type: "status", position: { x: 250, y: 630 }, data: { status: "QUALIFIED" } },
        ],
        edges: [
          { id: "e1", source: "trigger", target: "s1", sourceHandle: "out" },
          { id: "e2", source: "s1", target: "w1", sourceHandle: "out" },
          { id: "e3", source: "w1", target: "ai1", sourceHandle: "out" },
          { id: "e4", source: "ai1", target: "t1", sourceHandle: "out" },
          { id: "e5", source: "t1", target: "st1", sourceHandle: "out" },
        ],
      },
    };
  }

  if (key === "appointment") {
    return {
      name: "Appointment Booking",
      keyword: null,
      graph: {
        nodes: [
          trigger,
          { id: "s1", type: "send", position: { x: 220, y: 130 }, data: { message: "Would you like to book a free consultation? Reply YES and I'll send the link. 📅" } },
          { id: "w1", type: "wait", position: { x: 260, y: 280 }, data: {} },
          { id: "c1", type: "condition", position: { x: 250, y: 390 }, data: { keyword: "yes" } },
          { id: "s2", type: "send", position: { x: 40, y: 520 }, data: { message: "Awesome! Here's my calendar — pick any slot: https://cal.com/your-link" } },
          { id: "s3", type: "send", position: { x: 430, y: 520 }, data: { message: "No problem — just message me whenever you're ready! 🙌" } },
        ],
        edges: [
          { id: "e1", source: "trigger", target: "s1", sourceHandle: "out" },
          { id: "e2", source: "s1", target: "w1", sourceHandle: "out" },
          { id: "e3", source: "w1", target: "c1", sourceHandle: "out" },
          { id: "e4", source: "c1", target: "s2", sourceHandle: "match" },
          { id: "e5", source: "c1", target: "s3", sourceHandle: "else" },
        ],
      },
    };
  }

  // blank
  return { name: "New Flow", keyword: null, graph: { nodes: [trigger], edges: [] } };
}
