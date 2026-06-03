import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCalendarEvent, getValidGoogleToken } from "@/lib/google";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { summary, description, start, end } = await req.json().catch(() => ({}));
  if (!summary?.trim() || !start || !end) {
    return NextResponse.json({ error: "Title, start, and end are required" }, { status: 400 });
  }
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }

  const token = await getValidGoogleToken();
  if (!token) return NextResponse.json({ error: "Google is not connected" }, { status: 400 });

  const result = await createCalendarEvent(token, { summary, description, start, end });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, htmlLink: result.htmlLink });
}
