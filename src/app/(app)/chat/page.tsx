import { prisma } from "@/lib/prisma";
import ChatInbox, { type ConversationDTO } from "@/components/ChatInbox";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const [conversations, users] = await Promise.all([
    prisma.conversation.findMany({
      orderBy: { lastMessageAt: "desc" },
      include: {
        lead: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);

  const dto: ConversationDTO[] = conversations.map((c) => ({
    id: c.id,
    channel: c.channel,
    unreadCount: c.unreadCount,
    lastMessageAt: c.lastMessageAt.toISOString(),
    lead: {
      id: c.lead.id,
      name: c.lead.name,
      phone: c.lead.phone,
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
  }));

  return <ChatInbox conversations={dto} users={users} initialConversationId={searchParams.c} />;
}
