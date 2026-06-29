import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lightweight polling endpoint: the widget calls this to pick up live replies an
// agent sent from the inbox, and to learn whether a human has taken over.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const after = req.nextUrl.searchParams.get("after");
  if (!sessionId) return NextResponse.json({ messages: [], humanTakeover: false });

  const conversation = await prisma.conversation.findUnique({
    where: { sessionId },
    select: { id: true, humanTakeover: true },
  });
  if (!conversation) return NextResponse.json({ messages: [], humanTakeover: false });

  const since = after ? new Date(after) : new Date(0);
  const msgs = await prisma.message.findMany({
    where: { conversationId: conversation.id, status: "agent", createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { body: true, createdAt: true },
  });

  return NextResponse.json({
    humanTakeover: conversation.humanTakeover,
    messages: msgs.map((m) => ({ text: m.body, createdAt: m.createdAt.toISOString() })),
  });
}
