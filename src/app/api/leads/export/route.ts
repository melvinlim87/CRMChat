import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

function csvCell(v: string | null | undefined): string {
  const s = (v ?? "").toString();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true, email: true } } },
  });

  const header = ["name", "phone", "email", "company", "status", "tags", "owner", "source", "created"];
  const lines = [header.join(",")];
  for (const l of leads) {
    lines.push(
      [
        csvCell(l.name),
        csvCell(l.phone),
        csvCell(l.email),
        csvCell(l.company),
        csvCell(l.status),
        csvCell(l.tags.join(";")),
        csvCell(l.owner?.name || l.owner?.email || ""),
        csvCell(l.source),
        csvCell(l.createdAt.toISOString().slice(0, 10)),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-${date}.csv"`,
    },
  });
}
