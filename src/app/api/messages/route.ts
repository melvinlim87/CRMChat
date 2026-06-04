import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendWhatsAppText } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, body } = await req.json().catch(() => ({}));
  if (!conversationId || !body?.trim()) {
    return NextResponse.json({ error: "conversationId and body are required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { lead: true },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  // Attempt to deliver via WhatsApp. If not configured, we still persist the
  // message locally so the UI works end-to-end during development.
  let status = "sent";
  let externalId: string | null = null;
  let deliveryError: string | undefined;

  if (conversation.lead.phone) {
    const result = await sendWhatsAppText(conversation.lead.phone, body);
    externalId = result.id;
    if (result.error) {
      status = result.id ? "sent" : "failed_local";
      deliveryError = result.error;
    }
  } else {
    status = "failed_local";
    deliveryError = "Lead has no phone number";
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      body,
      status,
      externalId,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: message.createdAt, unreadCount: 0, needsHuman: false },
  });

  return NextResponse.json({
    message: {
      id: message.id,
      direction: message.direction,
      body: message.body,
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    },
    deliveryError,
  });
}
