import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { AutomationAction } from "@prisma/client";

const VALID_ACTIONS: AutomationAction[] = ["AUTO_REPLY", "ADD_TAG", "SET_STATUS"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const automations = await prisma.automation.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ automations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, keyword, action, actionValue } = await req.json().catch(() => ({}));
  if (!name?.trim() || !VALID_ACTIONS.includes(action) || !actionValue?.trim()) {
    return NextResponse.json({ error: "name, action, and actionValue are required" }, { status: 400 });
  }

  const automation = await prisma.automation.create({
    data: {
      name: name.trim(),
      keyword: keyword?.trim() || null,
      action,
      actionValue: actionValue.trim(),
      trigger: "MESSAGE_RECEIVED",
    },
  });
  return NextResponse.json({ automation });
}
