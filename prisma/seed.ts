import { PrismaClient, LeadStatus, MessageDirection } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@crmchat.app";
  const password = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Jeremy Wong", password },
  });

  const seedLeads: Array<{
    name: string;
    phone: string;
    email: string;
    company: string;
    status: LeadStatus;
    tags: string[];
    messages: Array<{ direction: MessageDirection; body: string; minutesAgo: number }>;
  }> = [
    {
      name: "Sarah Chen",
      phone: "+6591234567",
      email: "sarah@acme.co",
      company: "Acme Co",
      status: LeadStatus.QUALIFIED,
      tags: ["hot", "demo-booked"],
      messages: [
        { direction: MessageDirection.INBOUND, body: "Hi! I saw your ad about the CRM. Can you tell me more?", minutesAgo: 180 },
        { direction: MessageDirection.OUTBOUND, body: "Absolutely! CRMChat lets you manage all your WhatsApp leads in one inbox. Want a quick demo?", minutesAgo: 175 },
        { direction: MessageDirection.INBOUND, body: "Yes please, tomorrow at 2pm works for me.", minutesAgo: 12 },
      ],
    },
    {
      name: "David Tan",
      phone: "+6598765432",
      email: "david@globex.io",
      company: "Globex",
      status: LeadStatus.CONTACTED,
      tags: ["follow-up"],
      messages: [
        { direction: MessageDirection.INBOUND, body: "What's the pricing for 5 users?", minutesAgo: 1440 },
        { direction: MessageDirection.OUTBOUND, body: "Hey David! Our team plan is $49/mo for 5 users. I can send over the full breakdown.", minutesAgo: 1430 },
      ],
    },
    {
      name: "Priya Nair",
      phone: "+6590011223",
      email: "priya@initech.com",
      company: "Initech",
      status: LeadStatus.NEW,
      tags: ["new"],
      messages: [
        { direction: MessageDirection.INBOUND, body: "Do you integrate with Instagram DMs too?", minutesAgo: 30 },
      ],
    },
    {
      name: "Marcus Lee",
      phone: "+6594455667",
      email: "marcus@umbrella.co",
      company: "Umbrella Corp",
      status: LeadStatus.WON,
      tags: ["customer"],
      messages: [
        { direction: MessageDirection.OUTBOUND, body: "Welcome aboard Marcus! Your account is all set up.", minutesAgo: 5000 },
        { direction: MessageDirection.INBOUND, body: "Thanks team, loving it so far!", minutesAgo: 4980 },
      ],
    },
  ];

  for (const l of seedLeads) {
    const lead = await prisma.lead.upsert({
      where: { phone: l.phone },
      update: {},
      create: {
        name: l.name,
        phone: l.phone,
        email: l.email,
        company: l.company,
        status: l.status,
        tags: l.tags,
        ownerId: user.id,
        source: "whatsapp",
      },
    });

    const last = l.messages[l.messages.length - 1];
    const conversation = await prisma.conversation.upsert({
      where: { leadId: lead.id },
      update: {},
      create: {
        leadId: lead.id,
        channel: "whatsapp",
        unreadCount: last.direction === MessageDirection.INBOUND ? 1 : 0,
        lastMessageAt: new Date(Date.now() - last.minutesAgo * 60_000),
      },
    });

    // Avoid duplicating messages on re-seed
    const existing = await prisma.message.count({ where: { conversationId: conversation.id } });
    if (existing === 0) {
      for (const m of l.messages) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            direction: m.direction,
            body: m.body,
            createdAt: new Date(Date.now() - m.minutesAgo * 60_000),
          },
        });
      }
    }
  }

  await prisma.integration.upsert({
    where: { provider: "whatsapp" },
    update: {},
    create: { provider: "whatsapp", status: "disconnected" },
  });

  console.log("Seed complete. Login with demo@crmchat.app / password123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
