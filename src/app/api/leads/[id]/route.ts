import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { LeadStatus } from "@prisma/client";

const VALID_STATUS: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: { ownerId?: string | null; status?: LeadStatus } = {};

  if ("ownerId" in body) {
    data.ownerId = body.ownerId || null;
  }
  if ("status" in body && VALID_STATUS.includes(body.status)) {
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data,
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ lead });
}
