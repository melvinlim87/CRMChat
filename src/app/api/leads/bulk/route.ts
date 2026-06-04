import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { LeadStatus, Prisma } from "@prisma/client";

const VALID_STATUS: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

type Row = { name?: string; phone?: string; email?: string; company?: string; status?: string };

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await req.json().catch(() => ({}));
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const seenPhones = new Set<string>();
  const data: Prisma.LeadCreateManyInput[] = [];
  let skipped = 0;

  for (const r of rows as Row[]) {
    const name = (r.name || "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    const phone = r.phone?.trim() ? `+${String(r.phone).replace(/[^\d]/g, "")}` : null;
    if (phone) {
      if (seenPhones.has(phone)) {
        skipped++;
        continue;
      }
      seenPhones.add(phone);
    }
    const status = VALID_STATUS.includes((r.status || "").toUpperCase() as LeadStatus)
      ? ((r.status || "").toUpperCase() as LeadStatus)
      : "NEW";
    data.push({
      name,
      phone,
      email: r.email?.trim() || null,
      company: r.company?.trim() || null,
      status,
      source: "import",
      tags: ["import"],
    });
  }

  // skipDuplicates skips rows whose phone already exists (unique constraint).
  const result = await prisma.lead.createMany({ data, skipDuplicates: true });
  skipped += data.length - result.count;

  return NextResponse.json({ created: result.count, skipped });
}
