import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAllWidgets } from "@/lib/widget";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ widgets: await getAllWidgets() });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const key = String(b.key || "").trim();
  if (!key) return NextResponse.json({ error: "Widget key is required" }, { status: 400 });

  const data = {
    name: typeof b.name === "string" && b.name.trim() ? b.name.trim() : key,
    title: typeof b.title === "string" && b.title.trim() ? b.title.trim() : "Chat with us",
    welcome: typeof b.welcome === "string" && b.welcome.trim() ? b.welcome.trim() : "Hi! How can I help?",
    color: typeof b.color === "string" && b.color.trim() ? b.color.trim() : "#cda14a",
    instruction: typeof b.instruction === "string" && b.instruction.trim() ? b.instruction.trim() : null,
    tag: typeof b.tag === "string" && b.tag.trim() ? b.tag.trim() : null,
  };

  await prisma.widget.upsert({
    where: { key },
    update: data,
    create: { key, ...data },
  });
  return NextResponse.json({ widgets: await getAllWidgets() });
}
