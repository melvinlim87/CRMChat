import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReply, REPLY_RULES, type ChatMessage } from "@/lib/ai";
import { getKnowledgeContext } from "@/lib/knowledge";
import { detectNegative } from "@/lib/sentiment";
import { notifySlack } from "@/lib/slack";
import { runAutomations } from "@/lib/automation-engine";
import { getWidget } from "@/lib/widget";

// Public endpoint the embeddable website widget calls. No auth — it's meant to
// run on the customer's public site. Each browser session maps to one CRM
// conversation so widget chats show up in the inbox as leads.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { sessionId, message, name, email, widget: widgetKey } = await req.json().catch(() => ({}));
  if (!sessionId || !message?.trim()) {
    return NextResponse.json({ error: "sessionId and message are required" }, { status: 400 });
  }

  const widget = await getWidget(widgetKey || "public");
  const leadTags = Array.from(new Set([widget.tag || "widget", "widget"]));

  // Find or create the conversation for this widget session.
  let conversation = await prisma.conversation.findUnique({
    where: { sessionId },
    include: { lead: true, messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });

  if (!conversation) {
    const lead = await prisma.lead.create({
      data: { name: name?.trim() || "Website Visitor", email: email?.trim() || null, source: `widget:${widget.key}`, status: "NEW", tags: leadTags },
    });
    conversation = await prisma.conversation.create({
      data: { leadId: lead.id, channel: "widget", sessionId },
      include: { lead: true, messages: true },
    });
  } else if ((name?.trim() || email?.trim()) && conversation.lead.name === "Website Visitor") {
    await prisma.lead.update({
      where: { id: conversation.leadId },
      data: { name: name?.trim() || conversation.lead.name, email: email?.trim() || conversation.lead.email },
    });
  }

  // Record the visitor's message.
  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "INBOUND", body: message.trim(), status: "received" },
  });

  // Flag for human attention if the message reads as frustrated/negative.
  if (detectNegative(message)) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { needsHuman: true } });
    await notifySlack(`⚠️ A website visitor may need a human:\n> ${message.trim()}`);
  }

  // Build history and generate a knowledge-grounded reply.
  const history: ChatMessage[] = conversation.messages.map((m) => ({
    role: m.direction === "INBOUND" ? "user" : "assistant",
    content: m.body,
  }));
  history.push({ role: "user", content: message.trim() });

  const knowledge = await getKnowledgeContext();
  const system =
    `You are a warm, friendly human support agent chatting on a company's website — not a robot. Sound natural and conversational, like a real person texting. No markdown, no bullet points, no emoji spam. ` +
    `Reply with one to three SHORT messages, the way a person would split their thoughts across a few chat bubbles instead of one long paragraph. ` +
    `Put each separate message on its own line, separated by a line containing only "---". Most simple answers need just one message; use a second or third only when it genuinely helps (e.g. a quick greeting, then the answer, then a follow-up question). Keep every message to 1-2 sentences. ` +
    `Only answer using the knowledge base below and the conversation. If you don't know or it's not covered, warmly say you'll connect them with the team and ask for their name and email. ${REPLY_RULES}` +
    (widget.instruction ? `\n\n${widget.instruction}` : "") +
    (knowledge ? `\n\nKnowledge base (this is what you know about the company — rely on it):\n${knowledge}` : "");

  const result = await generateReply(history, system);
  const replies = splitReplies(result.text) || [
    "Thanks for reaching out! 🙏",
    "Our team will follow up shortly. Could you share your name and email so we can get back to you?",
  ];

  // Store each bubble as its own outbound message so the inbox mirrors the chat.
  for (const body of replies) {
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: "OUTBOUND", body, status: result.text ? "sent" : "failed_local" },
    });
  }
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), unreadCount: { increment: replies.length } },
  });

  // Run message automations (n8n workflows) for this widget message.
  await runAutomations("MESSAGE_RECEIVED", { lead: conversation.lead, conversation, text: message.trim() }).catch(() => {});

  // `reply` kept for backwards compatibility with older widget clients.
  return NextResponse.json({ replies, reply: replies.join("\n\n") });
}

// Turn the model's output into a sequence of human-like chat bubbles. The model
// is asked to separate bubbles with a line of "---"; we also fall back to
// splitting on blank lines, and cap it at 3 so it never floods the visitor.
function splitReplies(text: string | null): string[] | null {
  if (!text || !text.trim()) return null;
  let parts = text
    .split(/^\s*-{2,}\s*$/m)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    parts = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  if (parts.length === 0) return null;
  return parts.slice(0, 3);
}
