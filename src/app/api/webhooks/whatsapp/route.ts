import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAutomations } from "@/lib/automation-engine";
import { runInboundFlows } from "@/lib/flow-engine";
import { getWhatsAppVerifyToken, sendWhatsAppText } from "@/lib/whatsapp";
import { notifySlack } from "@/lib/slack";
import { detectNegative, detectHumanRequest } from "@/lib/sentiment";
import { generateReply, REPLY_RULES, type ChatMessage } from "@/lib/ai";
import { getKnowledgeContext } from "@/lib/knowledge";

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
          const beforeOut = await prisma.message.count({ where: { conversationId: conversation.id, direction: "OUTBOUND" } });
          await runAutomations("MESSAGE_RECEIVED", { lead, conversation, text });
          await runInboundFlows({ lead, conversation, text });

          // Knowledge-base AI auto-reply (if enabled and nothing else handled it).
          await maybeAiReply({ conversationId: conversation.id, leadName: profileName, phone: fromPhone, text, beforeOut });
        }
      }
    }
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    // Always 200 so Meta does not retry indefinitely.
  }

  return NextResponse.json({ ok: true });
}

// Whether the knowledge-base AI should auto-reply on WhatsApp (default on once connected).
async function whatsappAiEnabled(): Promise<boolean> {
  const row = await prisma.integration.findUnique({ where: { provider: "whatsapp" } });
  if (row?.status !== "connected") return false;
  const cfg = (row.config as { aiReply?: boolean }) || {};
  return cfg.aiReply !== false;
}

async function maybeAiReply(p: { conversationId: string; leadName: string; phone: string; text: string; beforeOut: number }) {
  if (!(await whatsappAiEnabled())) return;

  const conversation = await prisma.conversation.findUnique({
    where: { id: p.conversationId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });
  if (!conversation) return;

  // A human is already handling this chat — stay quiet.
  if (conversation.humanTakeover) return;

  // Explicit "talk to a human" or a frustrated message → hand off, no AI answer.
  if (detectHumanRequest(p.text) || detectNegative(p.text)) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { humanTakeover: true, needsHuman: true } });
    const handoff = "Thanks for reaching out — I'm connecting you with a member of our team who'll reply here shortly. 🙌";
    const sent = await sendWhatsAppText(p.phone, handoff);
    await prisma.message.create({
      data: { conversationId: conversation.id, direction: "OUTBOUND", body: handoff, externalId: sent.id, status: sent.id ? "sent" : "failed_local" },
    });
    return;
  }

  // A flow or automation already replied this round — don't double up.
  const afterOut = await prisma.message.count({ where: { conversationId: conversation.id, direction: "OUTBOUND" } });
  if (afterOut > p.beforeOut) return;

  const history: ChatMessage[] = conversation.messages.map((m) => ({
    role: m.direction === "INBOUND" ? "user" : "assistant",
    content: m.body,
  }));

  const knowledge = await getKnowledgeContext();
  const system =
    `You are a friendly human support agent replying to a customer on WhatsApp. Sound natural and concise (1-3 short sentences), warm and helpful. ` +
    `Only answer from the knowledge base below and the conversation; if it's not covered, say you'll get a team member to follow up. ${REPLY_RULES}` +
    (knowledge ? `\n\nKnowledge base:\n${knowledge}` : "");

  const result = await generateReply(history, system);
  const reply = result.text;
  if (!reply) return; // no AI key / error — leave it in the inbox for a human

  const sent = await sendWhatsAppText(p.phone, reply);
  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "OUTBOUND", body: reply, externalId: sent.id, status: sent.id ? "sent" : "failed_local" },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
}
