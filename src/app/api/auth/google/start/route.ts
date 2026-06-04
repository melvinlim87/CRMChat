import { NextRequest, NextResponse } from "next/server";
import { googleConfigured } from "@/lib/google";

// Begins "Sign in with Google" — a lightweight OAuth flow that only needs the
// user's identity (separate from the Gmail/Calendar/Drive integration flow).
export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }

  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/google/callback`;
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  res.cookies.set("google_signin_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
