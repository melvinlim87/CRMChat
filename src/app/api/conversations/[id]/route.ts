import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Toggle human takeover (e.g. agent hands the chat back to the AI).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b.humanTakeover === "boolean") data.humanTakeover = b.humanTakeover;
  if (typeof b.needsHuman === "boolean") data.needsHuman = b.needsHuman;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const c = await prisma.conversation.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, humanTakeover: c.humanTakeover, needsHuman: c.needsHuman });
}
