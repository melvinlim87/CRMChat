import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const audience = ["all", "public", "student"].includes(b.audience) ? b.audience : null;
  if (!audience) return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  await prisma.document.update({ where: { id: params.id }, data: { audience } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
