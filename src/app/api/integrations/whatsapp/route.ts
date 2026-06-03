import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phoneNumberId, accessToken, verifyToken } = await req.json().catch(() => ({}));
  if (!phoneNumberId?.trim() || !accessToken?.trim()) {
    return NextResponse.json({ error: "Phone number ID and access token are required" }, { status: 400 });
  }

  const config = {
    phoneNumberId: phoneNumberId.trim(),
    accessToken: accessToken.trim(),
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
