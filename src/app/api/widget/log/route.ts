import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifySlack } from "@/lib/slack";
import { getWidget } from "@/lib/widget";

// Records scripted widget-flow messages (button taps, bot script lines) into the
// CRM so the inbox mirrors the conversation even before the AI takes over.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { sessionId, widget: widgetKey, direction, body, name, email, needsHuman } = await req.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const widget = await getWidget(widgetKey || "public");
  const leadTags = Array.from(new Set([widget.tag || "widget", "widget"]));

  let conversation = await prisma.conversation.findUnique({ where: { sessionId }, include: { lead: true } });

  if (!conversation) {
    const existing = email?.trim()
      ? await prisma.lead.findFirst({
          where: { email: { equals: email.trim(), mode: "insensitive" } },
          include: { conversation: true },
        })
      : null;
    if (existing?.conversation) {
      conversation = await prisma.conversation.update({
        where: { id: existing.conversation.id },
        data: { sessionId: existing.conversation.sessionId ?? sessionId },
        include: { lead: true },
      });
    } else {
      const lead =
        existing ||
        (await prisma.lead.create({
          data: { name: name?.trim() || "Website Visitor", email: email?.trim() || null, source: `widget:${widget.key}`, status: "NEW", tags: leadTags },
        }));
      conversation = await prisma.conversation.create({
        data: { leadId: lead.id, channel: "widget", sessionId },
        include: { lead: true },
      });
    }
  } else if ((name?.trim() || email?.trim()) && conversation.lead.name === "Website Visitor") {
    await prisma.lead.update({
      where: { id: conversation.leadId },
      data: { name: name?.trim() || conversation.lead.name, email: email?.trim() || conversation.lead.email },
    });
  }

  if (typeof body === "string" && body.trim()) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: direction === "INBOUND" ? "INBOUND" : "OUTBOUND",
        body: body.trim(),
        status: direction === "INBOUND" ? "received" : "sent",
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
    });
  }

  if (needsHuman) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { needsHuman: true } });
    await notifySlack(`🙋 A website visitor asked to talk to a human (via flow).`);
  }

  return NextResponse.json({ ok: true });
}
