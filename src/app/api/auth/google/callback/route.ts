import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { exchangeCode } from "@/lib/google";

// Who's allowed to create an account via Google sign-in. If neither env var is
// set, sign-in is open (anyone with a Google account) — lock it down before
// going live by setting GOOGLE_ALLOWED_DOMAIN or GOOGLE_ALLOWED_EMAILS.
function signInAllowed(email: string): boolean {
  const allowedEmails = (process.env.GOOGLE_ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const domain = (process.env.GOOGLE_ALLOWED_DOMAIN || "").trim().toLowerCase();
  if (allowedEmails.length === 0 && !domain) return true;
  const e = email.toLowerCase();
  if (allowedEmails.includes(e)) return true;
  if (domain && e.endsWith(`@${domain}`)) return true;
  return false;
}

function decodeIdToken(idToken?: string): { email?: string; name?: string } {
  if (!idToken) return {};
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString());
    return { email: payload.email, name: payload.name };
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const expected = req.cookies.get("google_signin_state")?.value;

  if (params.get("error") || !code || !state || state !== expected) {
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }

  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/google/callback`;

  let email: string | undefined;
  let name: string | undefined;
  try {
    const tokens = await exchangeCode(code, redirectUri);
    ({ email, name } = decodeIdToken(tokens.id_token));
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }
  if (!email) return NextResponse.redirect(new URL("/login?error=google_failed", req.url));

  const normalized = email.toLowerCase();
  let user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user) {
    if (!signInAllowed(normalized)) {
      return NextResponse.redirect(new URL("/login?error=not_authorized", req.url));
    }
    user = await prisma.user.create({
      data: { email: normalized, name: name || normalized.split("@")[0], password: await bcrypt.hash(crypto.randomUUID(), 10) },
    });
  }

  await createSession({ id: user.id, email: user.email, name: user.name });
  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.delete("google_signin_state");
  return res;
}
