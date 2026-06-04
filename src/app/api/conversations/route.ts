import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Lightweight polling endpoint the client can use to refresh the inbox.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    include: {
      lead: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      channel: c.channel,
      unreadCount: c.unreadCount,
      needsHuman: c.needsHuman,
      lastMessageAt: c.lastMessageAt.toISOString(),
      lead: {
        id: c.lead.id,
        name: c.lead.name,
        phone: c.lead.phone,
        email: c.lead.email,
        company: c.lead.company,
        status: c.lead.status,
        tags: c.lead.tags,
        ownerId: c.lead.ownerId,
      },
      messages: c.messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        body: m.body,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
  });
}
