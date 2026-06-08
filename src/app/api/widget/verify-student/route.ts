import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint: verifies that an email belongs to an existing student record
// in the CRM before the widget lets them into the student chat. This is a
// lightweight "email match" gate (no password) — students are Leads tagged
// "student" or sourced from the students widget.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  const clean = typeof email === "string" ? email.trim() : "";
  if (!clean || !clean.includes("@")) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: {
      email: { equals: clean, mode: "insensitive" },
      OR: [{ tags: { has: "student" } }, { source: { contains: "student" } }],
    },
    select: { name: true },
  });

  if (!lead) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: true, name: lead.name });
}
