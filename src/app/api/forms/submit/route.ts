import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifySlack } from "@/lib/slack";
import { runAutomations } from "@/lib/automation-engine";

// Public endpoint: a published landing-page form posts here and we turn the
// submission into a CRM lead + conversation + inbound message.
export async function POST(req: NextRequest) {
  const { slug, name, email, phone, message } = await req.json().catch(() => ({}));

  if (!name?.trim() || (!email?.trim() && !phone?.trim())) {
    return NextResponse.json({ error: "Name and an email or phone are required" }, { status: 400 });
  }

  // Only accept submissions for a real, published page.
  if (slug) {
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page || !page.published) {
      return NextResponse.json({ error: "Form is not active" }, { status: 404 });
    }
  }

  const normalizedPhone = phone?.trim() ? `+${String(phone).replace(/[^\d]/g, "")}` : null;

  // Identify the lead by phone when available, otherwise create a fresh one.
  let lead = normalizedPhone
    ? await prisma.lead.findUnique({ where: { phone: normalizedPhone } })
    : null;
  const isNewLead = !lead;

  if (lead) {
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        name: name.trim() || lead.name,
        email: email?.trim() || lead.email,
        tags: lead.tags.includes("website") ? lead.tags : { set: [...lead.tags, "website"] },
      },
    });
  } else {
    lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: normalizedPhone,
        source: "website",
        status: "NEW",
        tags: ["website"],
      },
    });
  }

  const body = message?.trim() || `New form submission from ${name.trim()}`;

  const conversation = await prisma.conversation.upsert({
    where: { leadId: lead.id },
    update: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
    create: { leadId: lead.id, channel: "website", unreadCount: 1 },
  });

  await prisma.message.create({
    data: { conversationId: conversation.id, direction: "INBOUND", body, status: "received" },
  });

  await notifySlack(`📝 New website lead: *${name.trim()}* (${email || phone || "no contact"})\n> ${body}`);

  // Fire automations: form submitted (always) + lead created (if brand new).
  await runAutomations("FORM_SUBMITTED", { lead, conversation, text: body }).catch(() => {});
  if (isNewLead) await runAutomations("LEAD_CREATED", { lead, conversation, text: body }).catch(() => {});

  return NextResponse.json({ ok: true });
}
