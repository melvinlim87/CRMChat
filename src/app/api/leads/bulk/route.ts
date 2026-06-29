import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { LeadStatus } from "@prisma/client";

const VALID_STATUS: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

type Row = { name?: string; phone?: string; email?: string; company?: string; status?: string; tags?: string; notes?: string };

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await req.json().catch(() => ({}));
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  // Dedupe against phones already in the database (and within the batch).
  const phones = (rows as Row[])
    .map((r) => (r.phone?.trim() ? `+${String(r.phone).replace(/[^\d]/g, "")}` : null))
    .filter((p): p is string => !!p);
  const existing = phones.length
    ? new Set((await prisma.lead.findMany({ where: { phone: { in: phones } }, select: { phone: true } })).map((l) => l.phone!))
    : new Set<string>();

  const seen = new Set<string>();
  let created = 0;
  let skipped = 0;

  for (const r of rows as Row[]) {
    const name = (r.name || "").trim();
    if (!name) { skipped++; continue; }

    const phone = r.phone?.trim() ? `+${String(r.phone).replace(/[^\d]/g, "")}` : null;
    if (phone && (existing.has(phone) || seen.has(phone))) { skipped++; continue; }
    if (phone) seen.add(phone);

    const status = VALID_STATUS.includes((r.status || "").toUpperCase() as LeadStatus)
      ? ((r.status || "").toUpperCase() as LeadStatus)
      : "NEW";
    const tags = (r.tags || "")
      .split(/[;|]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const notes = (r.notes || "").trim();

    try {
      const lead = await prisma.lead.create({
        data: {
          name,
          phone,
          email: r.email?.trim() || null,
          company: r.company?.trim() || null,
          status,
          source: "import",
          tags: tags.length ? Array.from(new Set([...tags, "import"])) : ["import"],
        },
      });
      if (notes) {
        await prisma.note.create({ data: { leadId: lead.id, body: notes, authorId: session.id } });
      }
      created++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ created, skipped });
}
