import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAutomations } from "@/lib/automation-engine";
import { runInboundFlows } from "@/lib/flow-engine";
import { getWhatsAppVerifyToken } from "@/lib/whatsapp";
import { notifySlack } from "@/lib/slack";
import { detectNegative } from "@/lib/sentiment";

// 1) Webhook verification handshake (Meta calls this once when you subscribe).
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const verifyToken = await getWhatsAppVerifyToken();
  if (mode === "subscribe" && token && token === verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// 2) Inbound messages + status updates land here.
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: true });

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const contacts = value.contacts ?? [];
        const messages = value.messages ?? [];

        for (const msg of messages) {
          const fromPhone = `+${String(msg.from).replace(/[^\d]/g, "")}`;
          const profileName =
            contacts.find((c: any) => c.wa_id === msg.from)?.profile?.name || fromPhone;
          const text =
            msg.text?.body ??
            msg.button?.text ??
            msg.interactive?.list_reply?.title ??
            msg.interactive?.button_reply?.title ??
            `[${msg.type} message]`;

          // Upsert the lead by phone.
          const lead = await prisma.lead.upsert({
            where: { phone: fromPhone },
            update: {},
            create: {
              name: profileName,
              phone: fromPhone,
              source: "whatsapp",
              status: "NEW",
            },
          });

          // Ensure a conversation exists.
          const conversation = await prisma.conversation.upsert({
            where: { leadId: lead.id },
            update: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
            create: { leadId: lead.id, channel: "whatsapp", unreadCount: 1 },
          });

          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: "INBOUND",
              body: text,
              externalId: msg.id,
              status: "received",
            },
          });

          // Notify Slack (if connected) about the inbound message.
          await notifySlack(`💬 New WhatsApp message from *${profileName}* (${fromPhone}):\n> ${text}`);

          // Flag for human attention on negative sentiment.
          if (detectNegative(text)) {
            await prisma.conversation.update({ where: { id: conversation.id }, data: { needsHuman: true } });
            await notifySlack(`⚠️ *${profileName}* may need a human — message flagged as frustrated.`);
          }

          // Run automations (n8n-style + legacy), then AI flows.
          await runAutomations("MESSAGE_RECEIVED", { lead, conversation, text });
          await runInboundFlows({ lead, conversation, text });
        }
      }
    }
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    // Always 200 so Meta does not retry indefinitely.
  }

  return NextResponse.json({ ok: true });
}
