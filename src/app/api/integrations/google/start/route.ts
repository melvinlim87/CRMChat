import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAuthUrl, googleConfigured } from "@/lib/google";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/integrations?error=google_not_configured", req.url));
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/google/callback`;
  const state = crypto.randomUUID();

  const res = NextResponse.redirect(getAuthUrl(redirectUri, state));
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
