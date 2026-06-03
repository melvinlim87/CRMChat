// Lightweight automation engine. Runs when an inbound message arrives and
// applies any matching enabled rules (auto-reply, add tag, set status).
import type { Lead, Conversation } from "@prisma/client";
import { prisma } from "./prisma";
import { sendWhatsAppText } from "./whatsapp";

const VALID_STATUS = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] as const;

export async function runInboundAutomations(params: {
  lead: Lead;
  conversation: Conversation;
  text: string;
}): Promise<void> {
  const { conversation, text } = params;
  let lead = params.lead;

  const automations = await prisma.automation.findMany({
    where: { enabled: true, trigger: "MESSAGE_RECEIVED" },
    orderBy: { createdAt: "asc" },
  });

  const lower = text.toLowerCase();

  for (const a of automations) {
    const keyword = (a.keyword ?? "").trim().toLowerCase();
    if (keyword && !lower.includes(keyword)) continue;

    try {
      if (a.action === "ADD_TAG") {
        const tag = a.actionValue.trim();
        if (tag && !lead.tags.includes(tag)) {
          lead = await prisma.lead.update({
            where: { id: lead.id },
            data: { tags: { push: tag } },
          });
        }
      } else if (a.action === "SET_STATUS") {
        const status = a.actionValue.trim().toUpperCase();
        if ((VALID_STATUS as readonly string[]).includes(status)) {
          lead = await prisma.lead.update({
            where: { id: lead.id },
            data: { status: status as Lead["status"] },
          });
        }
      } else if (a.action === "AUTO_REPLY") {
        const body = a.actionValue;
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
          data: {
            conversationId: conversation.id,
            direction: "OUTBOUND",
            body,
            status,
            externalId,
          },
        });
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: message.createdAt },
        });
      }
    } catch (err) {
      console.error(`Automation "${a.name}" failed:`, err);
    }
  }
}
