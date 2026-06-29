import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof b.question === "string") data.question = b.question.trim();
  if (typeof b.answer === "string") data.answer = b.answer.trim();
  if (typeof b.category === "string") data.category = b.category.trim() || null;
  if (typeof b.order === "number") data.order = b.order;

  const faq = await prisma.faq.update({ where: { id: params.id }, data });
  return NextResponse.json({ faq });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.faq.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
