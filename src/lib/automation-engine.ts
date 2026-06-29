// n8n-style automation engine. An automation is a graph of nodes (trigger +
// actions) connected by edges. When a trigger event fires, we walk the graph
// and run each action. Legacy single-action automations still work.
import type { Lead, Conversation } from "@prisma/client";
import { prisma } from "./prisma";
import { sendWhatsAppText } from "./whatsapp";
import { generateReply, REPLY_RULES, type ChatMessage } from "./ai";
import { getKnowledgeContext } from "./knowledge";
import { notifySlack } from "./slack";

export type AutomationEvent = "MESSAGE_RECEIVED" | "LEAD_CREATED" | "FORM_SUBMITTED";
export type Ctx = { lead: Lead; conversation?: Conversation | null; text?: string };

type Node = { id: string; type: string; data: Record<string, any> };
type Edge = { id: string; source: string; target: string; sourceHandle?: string | null };
type Graph = { nodes: Node[]; edges: Edge[] };

const MAX_STEPS = 30;

export async function runAutomations(event: AutomationEvent, ctx: Ctx): Promise<void> {
  const automations = await prisma.automation.findMany({ where: { enabled: true, trigger: event } });
  for (const a of automations) {
    try {
      const graph = a.graph as unknown as Graph;
      if (graph?.nodes?.length) await runGraph(graph, ctx, event);
      else await runLegacy(a, ctx, event);
    } catch (err) {
      console.error(`Automation "${a.name}" failed:`, err);
    }
  }
}

/* ------------------------------ Graph runner ------------------------------ */

function nextNode(graph: Graph, fromId: string, handle?: string): string | undefined {
  const edge = graph.edges.find(
    (e) => e.source === fromId && (handle ? e.sourceHandle === handle : !e.sourceHandle || e.sourceHandle === "out")
  );
  return edge?.target;
}

async function runGraph(graph: Graph, ctx: Ctx, event: AutomationEvent) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const trigger = graph.nodes.find((n) => n.type === "trigger");
  if (!trigger) return;

  const text = (ctx.text || "").toLowerCase();
  // Trigger-level keyword filter (message events only).
  if (event === "MESSAGE_RECEIVED") {
    const kw = String(trigger.data?.keyword ?? "").toLowerCase();
    if (kw && !text.includes(kw)) return;
  }

  let lead = ctx.lead;
  let currentId = nextNode(graph, trigger.id);
  let steps = 0;

  while (currentId && steps < MAX_STEPS) {
    steps++;
    const node = byId.get(currentId);
    if (!node) break;
    const d = node.data || {};

    if (node.type === "condition") {
      const kw = String(d.keyword ?? "").toLowerCase();
      const matched = kw ? text.includes(kw) : true;
      currentId = nextNode(graph, node.id, matched ? "match" : "else");
      continue;
    }

    try {
      if (node.type === "send") {
        await deliver(lead, ctx, interpolate(String(d.message ?? ""), lead, ctx));
      } else if (node.type === "ai") {
        const reply = await aiReply(lead, ctx, String(d.instruction ?? ""));
        if (reply) await deliver(lead, ctx, reply);
      } else if (node.type === "tag") {
        const tag = String(d.tag ?? "").trim();
        if (tag && !lead.tags.includes(tag)) {
          lead = await prisma.lead.update({ where: { id: lead.id }, data: { tags: { push: tag } } });
        }
      } else if (node.type === "status") {
        const status = String(d.status ?? "").toUpperCase();
        if (["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"].includes(status)) {
          lead = await prisma.lead.update({ where: { id: lead.id }, data: { status: status as Lead["status"] } });
        }
      } else if (node.type === "slack") {
        await notifySlack(interpolate(String(d.text ?? ""), lead, ctx));
      } else if (node.type === "http") {
        await runHttp(d, lead, ctx);
      }
    } catch (err) {
      console.error(`Automation node ${node.id} (${node.type}) failed:`, err);
    }

    currentId = nextNode(graph, node.id);
  }
}

/* ------------------------------- Executors -------------------------------- */

function interpolate(s: string, lead: Lead, ctx: Ctx): string {
  return s
    .replace(/\{\{\s*name\s*\}\}/gi, lead.name || "")
    .replace(/\{\{\s*email\s*\}\}/gi, lead.email || "")
    .replace(/\{\{\s*phone\s*\}\}/gi, lead.phone || "")
    .replace(/\{\{\s*message\s*\}\}/gi, ctx.text || "");
}

async function ensureConversation(lead: Lead, ctx: Ctx): Promise<Conversation> {
  if (ctx.conversation) return ctx.conversation;
  const existing = await prisma.conversation.findUnique({ where: { leadId: lead.id } });
  if (existing) return existing;
  return prisma.conversation.create({ data: { leadId: lead.id, channel: "whatsapp" } });
}

async function deliver(lead: Lead, ctx: Ctx, body: string) {
  if (!body.trim()) return;
  const conversation = await ensureConversation(lead, ctx);
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
    data: { conversationId: conversation.id, direction: "OUTBOUND", body, status, externalId },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: message.createdAt } });
}

async function aiReply(lead: Lead, ctx: Ctx, instruction: string): Promise<string | null> {
  const conversation = await ensureConversation(lead, ctx);
  const msgs = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" }, take: 20 });
  const history: ChatMessage[] = msgs.map((m) => ({ role: m.direction === "INBOUND" ? "user" : "assistant", content: m.body }));
  if (history.length === 0) history.push({ role: "user", content: ctx.text || "Write a helpful opening message." });
  const knowledge = await getKnowledgeContext();
  const system =
    `You are a helpful assistant messaging a lead on behalf of the business. Lead: ${lead.name}. ` +
    `Reply concisely (1-3 sentences), warm and professional, no markdown. ${REPLY_RULES}` +
    (instruction ? `\n\nInstruction: ${instruction}` : "") +
    (knowledge ? `\n\nKnowledge base (use if relevant):\n${knowledge}` : "");
  const result = await generateReply(history, system);
  return result.text;
}

async function runHttp(d: Record<string, any>, lead: Lead, ctx: Ctx) {
  const url = String(d.url ?? "").trim();
  if (!/^https?:\/\//.test(url)) return;
  const method = (String(d.method ?? "POST").toUpperCase());
  const rawBody = interpolate(String(d.body ?? ""), lead, ctx);
  const init: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (method !== "GET" && method !== "HEAD") {
    // Default to sending the lead payload if no custom body provided.
    init.body = rawBody || JSON.stringify({ name: lead.name, email: lead.email, phone: lead.phone, message: ctx.text ?? "" });
  }
  await fetch(url, init).catch(() => {});
}

/* ------------------------------- Legacy path ------------------------------ */

async function runLegacy(a: { keyword: string | null; action: string | null; actionValue: string | null }, ctx: Ctx, event: AutomationEvent) {
  if (event !== "MESSAGE_RECEIVED" || !a.action) return;
  const text = (ctx.text || "").toLowerCase();
  const kw = (a.keyword ?? "").trim().toLowerCase();
  if (kw && !text.includes(kw)) return;

  let lead = ctx.lead;
  if (a.action === "ADD_TAG" && a.actionValue) {
    if (!lead.tags.includes(a.actionValue)) lead = await prisma.lead.update({ where: { id: lead.id }, data: { tags: { push: a.actionValue } } });
  } else if (a.action === "SET_STATUS" && a.actionValue) {
    const status = a.actionValue.toUpperCase();
    if (["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"].includes(status)) {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: status as Lead["status"] } });
    }
  } else if (a.action === "AUTO_REPLY" && a.actionValue) {
    await deliver(lead, ctx, a.actionValue);
  }
}
