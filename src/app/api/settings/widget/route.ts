import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getWidgetConfig, type WidgetConfig } from "@/lib/widget";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ config: await getWidgetConfig() });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const current = await getWidgetConfig();
  const next: WidgetConfig = {
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : current.title,
    welcome: typeof body.welcome === "string" && body.welcome.trim() ? body.welcome.trim() : current.welcome,
    color: typeof body.color === "string" && body.color.trim() ? body.color.trim() : current.color,
  };
  await prisma.setting.upsert({
    where: { key: "widget" },
    update: { value: next as object },
    create: { key: "widget", value: next as object },
  });
  return NextResponse.json({ config: next });
}
