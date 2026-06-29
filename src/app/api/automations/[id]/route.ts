import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { AutomationTrigger } from "@prisma/client";

const TRIGGERS: AutomationTrigger[] = ["MESSAGE_RECEIVED", "LEAD_CREATED", "FORM_SUBMITTED"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const automation = await prisma.automation.findUnique({ where: { id: params.id } });
  if (!automation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ automation });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: { name?: string; enabled?: boolean; trigger?: AutomationTrigger; graph?: object } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (body.trigger && TRIGGERS.includes(body.trigger)) data.trigger = body.trigger;
  if (body.graph && typeof body.graph === "object") data.graph = body.graph;

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const automation = await prisma.automation.update({ where: { id: params.id }, data });
  return NextResponse.json({ automation });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.automation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
