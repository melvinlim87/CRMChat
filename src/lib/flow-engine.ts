// Executes saved visual flows when an inbound WhatsApp message arrives.
// A flow is a graph of nodes (trigger/send/ai/condition/tag/status) connected
// by edges. We start at the trigger and walk the graph for the current message,
// branching at condition nodes based on the message text.
import type { Lead, Conversation } from "@prisma/client";
import { prisma } from "./prisma";
import { sendWhatsAppText } from "./whatsapp";
import { generateReply, type ChatMessage } from "./ai";

type FlowNode = { id: string; type: string; data: Record<string, any> };
type FlowEdge = { id: string; source: string; target: string; sourceHandle?: string | null };
type Graph = { nodes: FlowNode[]; edges: FlowEdge[] };

const MAX_STEPS = 20;

export async function runInboundFlows(params: {
  lead: Lead;
  conversation: Conversation;
  text: string;
}): Promise<void> {
  const { conversation, text } = params;
  let lead = params.lead;
  const lower = text.toLowerCase();

  const flows = await prisma.flow.findMany({ where: { enabled: true } });

  for (const flow of flows) {
    const keyword = (flow.keyword ?? "").trim().toLowerCase();
    if (keyword && !lower.includes(keyword)) continue;

    const graph = flow.graph as unknown as Graph;
    if (!graph?.nodes?.length) continue;

    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
    const trigger = graph.nodes.find((n) => n.type === "trigger");
    if (!trigger) continue;

    let currentId: string | undefined = nextNode(graph, trigger.id);
    let steps = 0;

    while (currentId && steps < MAX_STEPS) {
      steps++;
      const node = nodeById.get(currentId);
      if (!node) break;

      try {
        if (node.type === "condition") {
          const kw = String(node.data?.keyword ?? "").toLowerCase();
          const matched = kw ? lower.includes(kw) : true;
          currentId = nextNode(graph, node.id, matched ? "match" : "else");
          continue;
        }

        if (node.type === "send") {
          await deliver(conversation.id, lead, String(node.data?.message ?? ""));
        } else if (node.type === "ai") {
          const reply = await aiReply(conversation.id, lead, String(node.data?.instruction ?? ""));
          if (reply) await deliver(conversation.id, lead, reply);
        } else if (node.type === "tag") {
          const tag = String(node.data?.tag ?? "").trim();
          if (tag && !lead.tags.includes(tag)) {
            lead = await prisma.lead.update({ where: { id: lead.id }, data: { tags: { push: tag } } });
          }
        } else if (node.type === "status") {
          const status = String(node.data?.status ?? "").toUpperCase();
          if (["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"].includes(status)) {
            lead = await prisma.lead.update({ where: { id: lead.id }, data: { status: status as Lead["status"] } });
          }
        }
      } catch (err) {
        console.error(`Flow "${flow.name}" node ${node.id} failed:`, err);
      }

      currentId = nextNode(graph, node.id);
    }
  }
}

function nextNode(graph: Graph, fromId: string, handle?: string): string | undefined {
  const edge = graph.edges.find(
    (e) => e.source === fromId && (handle ? e.sourceHandle === handle : !e.sourceHandle || e.sourceHandle === "out")
  );
  return edge?.target;
}

async function deliver(conversationId: string, lead: Lead, body: string) {
  if (!body.trim()) return;
  let status = "sent";
  let externalId: string | null = null;
  if (lead.phone) {
    const result = await sendWhatsAppText(lead.phone, body);
    externalId = result.id;
    if (!result.id) status = "failed_local";
  } else {
    status = "failed_local";
  }
  const message = await prisma.message.create({
    data: { conversationId, direction: "OUTBOUND", body, status, externalId },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: message.createdAt },
  });
}

async function aiReply(conversationId: string, lead: Lead, instruction: string): Promise<string | null> {
  const msgs = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  const history: ChatMessage[] = msgs.map((m) => ({
    role: m.direction === "INBOUND" ? "user" : "assistant",
    content: m.body,
  }));
  const system =
    `You are a helpful assistant replying to a lead over WhatsApp on behalf of the business. ` +
    `Lead: ${lead.name}. Reply concisely (1-3 sentences), warm and professional, no markdown.` +
    (instruction ? `\n\nExtra instruction: ${instruction}` : "");
  const result = await generateReply(history, system);
  return result.text;
}
