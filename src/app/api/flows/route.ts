import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildTemplate, type TemplateKey } from "@/lib/flow-templates";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const flows = await prisma.flow.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ flows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, template } = await req.json().catch(() => ({}));

  const built = buildTemplate((template as TemplateKey) || "blank");
  const flow = await prisma.flow.create({
    data: {
      name: (name?.trim() as string) || built.name,
      keyword: built.keyword,
      graph: built.graph as object,
    },
  });
  return NextResponse.json({ flow });
}
