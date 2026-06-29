import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { disconnectGoogle } from "@/lib/google";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await disconnectGoogle();
  return NextResponse.json({ ok: true });
}
