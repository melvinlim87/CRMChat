import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { webhookUrl } = await req.json().catch(() => ({}));
  if (!webhookUrl?.trim() || !/^https:\/\/hooks\.slack\.com\//.test(webhookUrl.trim())) {
    return NextResponse.json({ error: "Enter a valid Slack Incoming Webhook URL" }, { status: 400 });
  }

  // Send a quick confirmation message to verify the webhook works.
  const test = await fetch(webhookUrl.trim(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "✅ CRMChat is now connected to this Slack channel." }),
  }).catch(() => null);

  if (!test || !test.ok) {
    return NextResponse.json({ error: "Slack rejected that webhook URL" }, { status: 400 });
  }

  await prisma.integration.upsert({
    where: { provider: "slack" },
    update: { status: "connected", config: { webhookUrl: webhookUrl.trim() } },
    create: { provider: "slack", status: "connected", config: { webhookUrl: webhookUrl.trim() } },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.integration.upsert({
    where: { provider: "slack" },
    update: { status: "disconnected", config: {} },
    create: { provider: "slack", status: "disconnected" },
  });
  return NextResponse.json({ ok: true });
}
