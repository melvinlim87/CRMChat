import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: a visitor rates an assistant reply with 👍 / 👎.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { sessionId, widget, rating, message } = await req.json().catch(() => ({}));
  const r = Number(rating);
  if (r !== 1 && r !== -1) return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  await prisma.widgetFeedback.create({
    data: {
      sessionId: typeof sessionId === "string" ? sessionId : null,
      widget: typeof widget === "string" ? widget : null,
      rating: r,
      message: typeof message === "string" ? message.slice(0, 1000) : "",
    },
  });
  return NextResponse.json({ ok: true });
}
