import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReply, REPLY_RULES, type ChatMessage } from "@/lib/ai";
import { getKnowledgeContext } from "@/lib/knowledge";
import { detectNegative, detectHumanRequest } from "@/lib/sentiment";
import { notifySlack } from "@/lib/slack";
import { runAutomations } from "@/lib/automation-engine";
import { getWidget, toneGuidance } from "@/lib/widget";

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
    // For a verified student (email provided), attach the chat to their existing
    // CRM record instead of creating a brand-new "Website Visitor" lead.
    let existing = email?.trim()
      ? await prisma.lead.findFirst({
          where: { email: { equals: email.trim(), mode: "insensitive" } },
          include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } } } },
        })
      : null;

    if (existing?.conversation) {
      // Each lead can have only one conversation — reuse it and adopt this session.
      conversation = await prisma.conversation.update({
        where: { id: existing.conversation.id },
        data: { sessionId: existing.conversation.sessionId ?? sessionId },
        include: { lead: true, messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      });
    } else {
      const lead =
        existing ||
        (await prisma.lead.create({
          data: { name: name?.trim() || "Website Visitor", email: email?.trim() || null, source: `widget:${widget.key}`, status: "NEW", tags: leadTags },
        }));
      conversation = await prisma.conversation.create({
        data: { leadId: lead.id, channel: "widget", sessionId },
        include: { lead: true, messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      });
    }
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

  // Explicit "talk to a human" → flag and respond deterministically (no AI),
  // so the handoff works even if no AI provider is configured.
  if (detectHumanRequest(message)) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { needsHuman: true } });
    await notifySlack(`🙋 A website visitor asked to talk to a human:\n> ${message.trim()}`);
    const handoff = [
      "Of course — I'll connect you with a member of our team. 🙌",
      "They'll pick this up shortly. Could you share your name and email so we can follow up?",
    ];
    for (const body of handoff) {
      await prisma.message.create({
        data: { conversationId: conversation.id, direction: "OUTBOUND", body, status: "sent" },
      });
    }
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), unreadCount: { increment: handoff.length } },
    });
    return NextResponse.json({ replies: handoff, suggestions: [], reply: handoff.join("\n\n"), handoff: true });
  }

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

  // Verified students chat on the "students" widget → student-scoped PDFs;
  // everyone else gets the general ones (both also include "all" docs).
  const audience: "public" | "student" = widget.key === "students" ? "student" : "public";
  const knowledge = await getKnowledgeContext(6000, audience);
  const system =
    `You are a human support agent chatting on a company's website — not a robot. Sound natural and conversational, like a real person texting. ${toneGuidance(widget.tone)} No markdown, no bullet points, no emoji spam. ` +
    `Reply with one to three SHORT messages, the way a person would split their thoughts across a few chat bubbles instead of one long paragraph. ` +
    `Put each separate message on its own line, separated by a line containing only "---". Most simple answers need just one message; use a second or third only when it genuinely helps (e.g. a quick greeting, then the answer, then a follow-up question). Keep every message to 1-2 sentences. ` +
    `Only answer using the knowledge base below and the conversation. If you don't know or it's not covered, warmly say you'll connect them with the team and ask for their name and email. ` +
    `After your messages, you MAY add one final line starting with "SUGGESTIONS:" followed by 2-3 very short follow-up questions the visitor is likely to ask next, separated by " | " (max 6 words each). Only include it when natural; omit the line otherwise. ${REPLY_RULES}` +
    (widget.instruction ? `\n\n${widget.instruction}` : "") +
    (knowledge ? `\n\nKnowledge base (this is what you know about the company — rely on it):\n${knowledge}` : "");

  const result = await generateReply(history, system);
  const { replies, suggestions } = parseReply(result.text);
  const finalReplies = replies || [
    "Thanks for reaching out! 🙏",
    "Our team will follow up shortly. Could you share your name and email so we can get back to you?",
  ];

  // Store each bubble as its own outbound message so the inbox mirrors the chat.
  for (const body of finalReplies) {
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: "OUTBOUND", body, status: result.text ? "sent" : "failed_local" },
    });
  }
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), unreadCount: { increment: finalReplies.length } },
  });

  // Run message automations (n8n workflows) for this widget message.
  await runAutomations("MESSAGE_RECEIVED", { lead: conversation.lead, conversation, text: message.trim() }).catch(() => {});

  // `reply` kept for backwards compatibility with older widget clients.
  return NextResponse.json({ replies: finalReplies, suggestions, reply: finalReplies.join("\n\n") });
}

// Restore an existing conversation so the widget keeps its history across reloads.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ messages: [] });
  const conversation = await prisma.conversation.findUnique({
    where: { sessionId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
  });
  if (!conversation) return NextResponse.json({ messages: [] });
  return NextResponse.json({
    messages: conversation.messages.map((m) => ({
      from: m.direction === "INBOUND" ? "user" : "bot",
      text: m.body,
    })),
  });
}

// Turn the model's output into human-like chat bubbles plus optional follow-up
// suggestion chips. Bubbles are separated by a line of "---" (with a blank-line
// fallback) and capped at 3 so it never floods the visitor. A trailing
// "SUGGESTIONS: a | b | c" line becomes tappable quick replies.
function parseReply(text: string | null): { replies: string[] | null; suggestions: string[] } {
  if (!text || !text.trim()) return { replies: null, suggestions: [] };

  let body = text;
  let suggestions: string[] = [];
  const m = body.match(/^\s*SUGGESTIONS:\s*(.+)$/im);
  if (m) {
    suggestions = m[1]
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    body = body.slice(0, m.index).trimEnd();
  }

  let parts = body
    .split(/^\s*-{2,}\s*$/m)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    parts = body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return { replies: parts.length ? parts.slice(0, 3) : null, suggestions };
}
