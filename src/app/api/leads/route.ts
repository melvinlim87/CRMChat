import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { LeadStatus } from "@prisma/client";

const VALID_STATUS: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const phone = body.phone?.trim() ? `+${String(body.phone).replace(/[^\d]/g, "")}` : null;
  if (phone) {
    const existing = await prisma.lead.findUnique({ where: { phone } });
    if (existing) return NextResponse.json({ error: "A contact with that phone already exists" }, { status: 409 });
  }

  const status: LeadStatus = VALID_STATUS.includes(body.status) ? body.status : "NEW";

  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      email: body.email?.trim() || null,
      company: body.company?.trim() || null,
      status,
      ownerId: body.ownerId || null,
      source: body.source?.trim() || "manual",
      tags: Array.isArray(body.tags) ? body.tags : [],
    },
  });

  return NextResponse.json({ lead });
}
