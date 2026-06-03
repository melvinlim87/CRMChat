import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await prisma.note.findMany({
    where: { leadId: params.id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true, email: true } } },
  });
  return NextResponse.json({
    notes: notes.map((n) => ({
      id: n.id,
      body: n.body,
      author: n.author?.name || n.author?.email || "Someone",
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = await req.json().catch(() => ({}));
  if (!body?.trim()) return NextResponse.json({ error: "Note body is required" }, { status: 400 });

  const note = await prisma.note.create({
    data: { leadId: params.id, body: body.trim(), authorId: session.id },
    include: { author: { select: { name: true, email: true } } },
  });
  return NextResponse.json({
    note: {
      id: note.id,
      body: note.body,
      author: note.author?.name || note.author?.email || "You",
      createdAt: note.createdAt.toISOString(),
    },
  });
}
