import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { exchangeCode, saveGoogleTokens } from "@/lib/google";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");
  const expectedState = req.cookies.get("google_oauth_state")?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/integrations?error=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/integrations?error=invalid_state", req.url));
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/integrations/google/callback`;

  try {
    const tokens = await exchangeCode(code, redirectUri);
    await saveGoogleTokens(tokens);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(new URL("/integrations?error=google_exchange_failed", req.url));
  }

  const res = NextResponse.redirect(new URL("/integrations?connected=google", req.url));
  res.cookies.delete("google_oauth_state");
  return res;
}
