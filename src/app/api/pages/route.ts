import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { newBlock } from "@/lib/blocks";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pages = await prisma.page.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json().catch(() => ({}));
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  // Ensure unique slug
  let slug = slugify(title);
  let n = 1;
  while (await prisma.page.findUnique({ where: { slug } })) slug = `${slugify(title)}-${++n}`;

  const blocks = [newBlock("hero")];
  const page = await prisma.page.create({ data: { title: title.trim(), slug, blocks } });
  return NextResponse.json({ page });
}
