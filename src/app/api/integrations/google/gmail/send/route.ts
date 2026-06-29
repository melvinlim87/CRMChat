import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getValidGoogleToken, sendGmail } from "@/lib/google";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { to, subject, body } = await req.json().catch(() => ({}));
  if (!to?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Recipient and message are required" }, { status: 400 });
  }

  const token = await getValidGoogleToken();
  if (!token) return NextResponse.json({ error: "Google is not connected" }, { status: 400 });

  const result = await sendGmail(token, { to, subject: subject || "(no subject)", body });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true });
}
