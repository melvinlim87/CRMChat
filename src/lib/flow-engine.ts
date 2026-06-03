// Executes saved visual flows when an inbound WhatsApp message arrives.
//
// Flows are multi-turn: a "wait" node pauses execution and persists the
// conversation's position in a FlowRun. The next inbound message resumes the
// flow from there, feeding that message into the following condition nodes.
//
// On each inbound message we either RESUME an active run for the conversation,
// or START the first enabled flow whose trigger keyword matches.
import type { Lead, Conversation } from "@prisma/client";
import { prisma } from "./prisma";
import { sendWhatsAppText } from "./whatsapp";
import { generateReply, type ChatMessage } from "./ai";

type FlowNode = { id: string; type: string; data: Record<string, any> };
type FlowEdge = { id: string; source: string; target: string; sourceHandle?: string | null };
type Graph = { nodes: FlowNode[]; edges: FlowEdge[] };

const MAX_STEPS = 25;

export async function runInboundFlows(params: {
  lead: Lead;
  conversation: Conversation;
  text: string;
}): Promise<void> {
  const { conversation } = params;

  // 1) Resume an active run if one exists for this conversation.
  const activeRun = await prisma.flowRun.findUnique({ where: { conversationId: conversation.id } });
  if (activeRun) {
    const flow = await prisma.flow.findUnique({ where: { id: activeRun.flowId } });
    if (flow?.enabled) {
      const graph = flow.graph as unknown as Graph;
      // We were paused at a wait node; consume this message and continue past it.
      const startId = nextNode(graph, activeRun.currentNodeId);
      await execute({ ...params }, graph, startId);
      return;
    }
    // Flow gone or disabled — clear the stale run and fall through to a fresh start.
    await prisma.flowRun.delete({ where: { conversationId: conversation.id } }).catch(() => {});
  }

  // 2) Otherwise start the first matching enabled flow.
  const lower = params.text.toLowerCase();
  const flows = await prisma.flow.findMany({ where: { enabled: true }, orderBy: { updatedAt: "asc" } });
  for (const flow of flows) {
    const keyword = (flow.keyword ?? "").trim().toLowerCase();
    if (keyword && !lower.includes(keyword)) continue;
    const graph = flow.graph as unknown as Graph;
    const trigger = graph?.nodes?.find((n) => n.type === "trigger");
    if (!trigger) continue;
    await execute(params, graph, nextNode(graph, trigger.id), flow.id);
    return; // one flow per message
  }
}

async function execute(
  params: { lead: Lead; conversation: Conversation; text: string },
  graph: Graph,
  startId: string | undefined,
  flowId?: string
): Promise<void> {
  const { conversation, text } = params;
  let lead = params.lead;
  const lower = text.toLowerCase();
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  let currentId = startId;
  let steps = 0;

  while (currentId && steps < MAX_STEPS) {
    steps++;
    const node = nodeById.get(currentId);
    if (!node) break;

    // Pause point: persist position and wait for the next inbound message.
    if (node.type === "wait") {
      const fid = flowId ?? (await prisma.flowRun.findUnique({ where: { conversationId: conversation.id } }))?.flowId;
      if (fid) {
        await prisma.flowRun.upsert({
          where: { conversationId: conversation.id },
          update: { currentNodeId: node.id, flowId: fid },
          create: { conversationId: conversation.id, flowId: fid, currentNodeId: node.id },
        });
      }
      return;
    }

    if (node.type === "condition") {
      const kw = String(node.data?.keyword ?? "").toLowerCase();
      const matched = kw ? lower.includes(kw) : true;
      currentId = nextNode(graph, node.id, matched ? "match" : "else");
      continue;
    }

    try {
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
      console.error(`Flow node ${node.id} (${node.type}) failed:`, err);
    }

    currentId = nextNode(graph, node.id);
  }

  // Reached the end (or step cap) — the flow is complete, clear any saved state.
  await prisma.flowRun.deleteMany({ where: { conversationId: conversation.id } }).catch(() => {});
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
  await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: message.createdAt } });
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
