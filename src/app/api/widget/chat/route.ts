import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReply, REPLY_RULES, type ChatMessage } from "@/lib/ai";
import { getKnowledgeContext } from "@/lib/knowledge";
import { detectNegative } from "@/lib/sentiment";
import { notifySlack } from "@/lib/slack";
import { runAutomations } from "@/lib/automation-engine";

// Public endpoint the embeddable website widget calls. No auth — it's meant to
// run on the customer's public site. Each browser session maps to one CRM
// conversation so widget chats show up in the inbox as leads.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { sessionId, message, name, email } = await req.json().catch(() => ({}));
  if (!sessionId || !message?.trim()) {
    return NextResponse.json({ error: "sessionId and message are required" }, { status: 400 });
  }

  // Find or create the conversation for this widget session.
  let conversation = await prisma.conversation.findUnique({
    where: { sessionId },
    include: { lead: true, messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });

  if (!conversation) {
    const lead = await prisma.lead.create({
      data: { name: name?.trim() || "Website Visitor", email: email?.trim() || null, source: "widget", status: "NEW", tags: ["widget"] },
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
    `You are the friendly AI assistant on a company's website. Answer the visitor's questions clearly and concisely (1-3 sentences), warm and helpful, no markdown. ` +
    `If you don't know, offer to connect them with the team and politely ask for their name and email. ${REPLY_RULES}` +
    (knowledge ? `\n\nUse this knowledge base when relevant:\n${knowledge}` : "");

  const result = await generateReply(history, system);
  const reply =
    result.text ||
    "Thanks for reaching out! Our team will follow up shortly. Could you share your name and email so we can get back to you?";

  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "OUTBOUND", body: reply, status: result.text ? "sent" : "failed_local" },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
  });

  // Run message automations (n8n workflows) for this widget message.
  await runAutomations("MESSAGE_RECEIVED", { lead: conversation.lead, conversation, text: message.trim() }).catch(() => {});

  return NextResponse.json({ reply });
}
