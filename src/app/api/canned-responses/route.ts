import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const responses = await prisma.cannedResponse.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ responses });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, body } = await req.json().catch(() => ({}));
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }
  const response = await prisma.cannedResponse.create({ data: { title: title.trim(), body: body.trim() } });
  return NextResponse.json({ response });
}
