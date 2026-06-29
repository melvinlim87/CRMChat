import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifySlack } from "@/lib/slack";

// Public: a visitor books a time through a flow "Booking" node.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { sessionId, widget, name, email, datetime, note } = await req.json().catch(() => ({}));
  const when = datetime ? new Date(datetime) : null;
  if (!when || isNaN(when.getTime())) return NextResponse.json({ error: "Invalid datetime" }, { status: 400 });

  const booking = await prisma.booking.create({
    data: {
      name: name?.trim() || null,
      email: email?.trim() || null,
      datetime: when,
      note: typeof note === "string" ? note.slice(0, 500) : "",
      sessionId: typeof sessionId === "string" ? sessionId : null,
      widget: typeof widget === "string" ? widget : null,
    },
  });

  // Attach a note to the lead if we can find the conversation.
  if (sessionId) {
    const conv = await prisma.conversation.findUnique({ where: { sessionId }, select: { leadId: true } });
    if (conv) {
      await prisma.note.create({
        data: { leadId: conv.leadId, body: `📅 Booked a call for ${when.toLocaleString()}${name ? ` (${name})` : ""}.` },
      }).catch(() => {});
      await prisma.conversation.update({ where: { sessionId }, data: { needsHuman: true } }).catch(() => {});
    }
  }

  await notifySlack(`📅 New booking: ${when.toLocaleString()}${name ? ` — ${name}` : ""}${email ? ` (${email})` : ""}`);
  return NextResponse.json({ ok: true, id: booking.id, datetime: when.toISOString() });
}
