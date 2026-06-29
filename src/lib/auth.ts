import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "crmchat_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-insecure-secret-change-me"
);

export type SessionUser = { id: string; email: string; name: string | null };

// Login is disabled — the app runs without an auth gate. When there's no
// session cookie we fall back to a default owner so admin APIs keep working.
const NO_LOGIN = true;
const DEFAULT_USER: SessionUser = { id: "owner", email: "owner@local", name: "Owner" };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return NO_LOGIN ? DEFAULT_USER : null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { id: payload.id as string, email: payload.email as string, name: (payload.name as string) ?? null };
  } catch {
    return NO_LOGIN ? DEFAULT_USER : null;
  }
}

export function destroySession() {
  cookies().delete(COOKIE_NAME);
}

export async function verifyCredentials(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return { id: user.id, email: user.email, name: user.name };
}
