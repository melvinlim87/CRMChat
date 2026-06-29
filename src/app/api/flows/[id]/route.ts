import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const flow = await prisma.flow.findUnique({ where: { id: params.id } });
  if (!flow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ flow });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; enabled?: boolean; keyword?: string | null; graph?: object } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if ("keyword" in body) data.keyword = body.keyword?.trim() || null;
  if (body.graph && typeof body.graph === "object") data.graph = body.graph;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const flow = await prisma.flow.update({ where: { id: params.id }, data });
  return NextResponse.json({ flow });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.flow.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
