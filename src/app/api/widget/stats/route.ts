import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Admin: assistant analytics for the Chat Widget page.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const widgetWhere = { conversation: { channel: "widget" } } as const;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [chats, chatsWeek, inbound, outbound, needsHuman, takenOver, up, down, bookings, top] = await Promise.all([
    prisma.conversation.count({ where: { channel: "widget" } }),
    prisma.conversation.count({ where: { channel: "widget", createdAt: { gte: weekAgo } } }),
    prisma.message.count({ where: { ...widgetWhere, direction: "INBOUND" } }),
    prisma.message.count({ where: { ...widgetWhere, direction: "OUTBOUND" } }),
    prisma.conversation.count({ where: { channel: "widget", needsHuman: true } }),
    prisma.conversation.count({ where: { channel: "widget", humanTakeover: true } }),
    prisma.widgetFeedback.count({ where: { rating: 1 } }),
    prisma.widgetFeedback.count({ where: { rating: -1 } }),
    prisma.booking.count(),
    prisma.message.groupBy({
      by: ["body"],
      where: { ...widgetWhere, direction: "INBOUND" },
      _count: { body: true },
      orderBy: { _count: { body: "desc" } },
      take: 6,
    }),
  ]);

  return NextResponse.json({
    chats,
    chatsWeek,
    inbound,
    outbound,
    needsHuman,
    takenOver,
    feedbackUp: up,
    feedbackDown: down,
    bookings,
    topQuestions: top.map((t) => ({ text: t.body, count: t._count.body })),
  });
}
