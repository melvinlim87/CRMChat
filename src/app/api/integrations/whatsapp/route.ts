import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await prisma.integration.findUnique({ where: { provider: "whatsapp" } });
  const cfg = (row?.config as { phoneNumberId?: string; accessToken?: string; verifyToken?: string }) || {};
  return NextResponse.json({
    connected: row?.status === "connected",
    phoneNumberId: cfg.phoneNumberId || "",
    verifyToken: cfg.verifyToken || "crmchat-verify",
    hasToken: Boolean(cfg.accessToken),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phoneNumberId, accessToken, verifyToken } = await req.json().catch(() => ({}));
  // Keep the existing token if the field was left blank when editing.
  const existing = await prisma.integration.findUnique({ where: { provider: "whatsapp" } });
  const existingToken = (existing?.config as { accessToken?: string })?.accessToken || "";
  const token = accessToken?.trim() || existingToken;
  if (!phoneNumberId?.trim() || !token) {
    return NextResponse.json({ error: "Phone number ID and access token are required" }, { status: 400 });
  }

  const config = {
    phoneNumberId: phoneNumberId.trim(),
    accessToken: token,
    verifyToken: verifyToken?.trim() || "crmchat-verify",
  };

  await prisma.integration.upsert({
    where: { provider: "whatsapp" },
    update: { status: "connected", config },
    create: { provider: "whatsapp", status: "connected", config },
  });

  return NextResponse.json({ ok: true, verifyToken: config.verifyToken });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.integration.upsert({
    where: { provider: "whatsapp" },
    update: { status: "disconnected", config: {} },
    create: { provider: "whatsapp", status: "disconnected" },
  });
  return NextResponse.json({ ok: true });
}
