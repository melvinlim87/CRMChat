import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { AutomationTrigger } from "@prisma/client";

function triggerNode(trigger: AutomationTrigger) {
  return { id: "trigger", type: "trigger", position: { x: 40, y: 120 }, data: { event: trigger, keyword: "" } };
}

function buildTemplate(template: string): { name: string; trigger: AutomationTrigger; graph: object } {
  if (template === "welcome-lead") {
    return {
      name: "Welcome new lead",
      trigger: "LEAD_CREATED",
      graph: {
        nodes: [
          triggerNode("LEAD_CREATED"),
          { id: "s1", type: "send", position: { x: 340, y: 120 }, data: { message: "Hi {{name}} 👋 thanks for reaching out! How can we help?" } },
          { id: "n1", type: "slack", position: { x: 640, y: 120 }, data: { text: "🎉 New lead: {{name}} ({{email}})" } },
        ],
        edges: [
          { id: "e1", source: "trigger", target: "s1", sourceHandle: "out" },
          { id: "e2", source: "s1", target: "n1", sourceHandle: "out" },
        ],
      },
    };
  }
  if (template === "keyword-route") {
    return {
      name: "Route pricing questions",
      trigger: "MESSAGE_RECEIVED",
      graph: {
        nodes: [
          { id: "trigger", type: "trigger", position: { x: 40, y: 140 }, data: { event: "MESSAGE_RECEIVED", keyword: "pricing" } },
          { id: "t1", type: "tag", position: { x: 340, y: 60 }, data: { tag: "pricing-interest" } },
          { id: "a1", type: "ai", position: { x: 340, y: 200 }, data: { instruction: "Answer the pricing question using the knowledge base." } },
        ],
        edges: [
          { id: "e1", source: "trigger", target: "t1", sourceHandle: "out" },
          { id: "e2", source: "t1", target: "a1", sourceHandle: "out" },
        ],
      },
    };
  }
  return { name: "New automation", trigger: "MESSAGE_RECEIVED", graph: { nodes: [triggerNode("MESSAGE_RECEIVED")], edges: [] } };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const automations = await prisma.automation.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ automations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, template } = await req.json().catch(() => ({}));
  const built = buildTemplate(template || "blank");
  const automation = await prisma.automation.create({
    data: {
      name: (name?.trim() as string) || built.name,
      trigger: built.trigger,
      enabled: false,
      graph: built.graph,
    },
  });
  return NextResponse.json({ automation });
}
