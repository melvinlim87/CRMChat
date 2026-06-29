import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { LeadStatus } from "@prisma/client";

const VALID_STATUS: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: {
    ownerId?: string | null;
    status?: LeadStatus;
    name?: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    tags?: string[];
  } = {};

  if ("ownerId" in body) data.ownerId = body.ownerId || null;
  if ("status" in body && VALID_STATUS.includes(body.status)) data.status = body.status;
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if ("email" in body) data.email = body.email?.trim() || null;
  if ("phone" in body) data.phone = body.phone?.trim() ? `+${String(body.phone).replace(/[^\d]/g, "")}` : null;
  if ("company" in body) data.company = body.company?.trim() || null;
  if (Array.isArray(body.tags)) data.tags = body.tags.map((t: unknown) => String(t).trim()).filter(Boolean);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.update({
      where: { id: params.id },
      data,
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ lead });
  } catch {
    return NextResponse.json({ error: "Couldn't save — that phone may already be in use" }, { status: 409 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.lead.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
