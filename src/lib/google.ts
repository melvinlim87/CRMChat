// Google OAuth + read access to Gmail, Calendar, and Drive.
// Uses Google's REST endpoints directly (no SDK) to keep deps minimal.
// A single Google connection (provider="google") grants all three scopes.
import { prisma } from "./prisma";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

export const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  // calendar.events covers reading and creating events.
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  id_token?: string;
};

type GoogleConfig = {
  email: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiryDate: number;
  scope: string;
};

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

function decodeEmailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString());
    return payload.email ?? null;
  } catch {
    return null;
  }
}

export async function saveGoogleTokens(tokens: TokenResponse): Promise<void> {
  const existing = await prisma.integration.findUnique({ where: { provider: "google" } });
  const prev = (existing?.config as GoogleConfig | null) ?? null;

  const config: GoogleConfig = {
    email: decodeEmailFromIdToken(tokens.id_token) ?? prev?.email ?? null,
    accessToken: tokens.access_token,
    // Google only returns a refresh token on first consent — keep the old one.
    refreshToken: tokens.refresh_token ?? prev?.refreshToken ?? null,
    expiryDate: Date.now() + tokens.expires_in * 1000,
    scope: tokens.scope,
  };

  await prisma.integration.upsert({
    where: { provider: "google" },
    update: { status: "connected", config: config as object },
    create: { provider: "google", status: "connected", config: config as object },
  });
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

export type GoogleStatus = { connected: boolean; email: string | null };

export async function getGoogleStatus(): Promise<GoogleStatus> {
  const rec = await prisma.integration.findUnique({ where: { provider: "google" } });
  if (!rec || rec.status !== "connected" || !rec.config) return { connected: false, email: null };
  return { connected: true, email: (rec.config as GoogleConfig).email };
}

/** Returns a valid access token, refreshing it if necessary, or null. */
export async function getValidGoogleToken(): Promise<string | null> {
  const rec = await prisma.integration.findUnique({ where: { provider: "google" } });
  if (!rec?.config) return null;
  const config = rec.config as GoogleConfig;

  if (config.expiryDate && config.expiryDate > Date.now() + 60_000) {
    return config.accessToken;
  }
  if (!config.refreshToken) return config.accessToken ?? null;

  const refreshed = await refreshAccessToken(config.refreshToken);
  if (!refreshed) return null;

  const newConfig: GoogleConfig = {
    ...config,
    accessToken: refreshed.access_token,
    expiryDate: Date.now() + refreshed.expires_in * 1000,
  };
  await prisma.integration.update({ where: { provider: "google" }, data: { config: newConfig as object } });
  return refreshed.access_token;
}

export async function disconnectGoogle(): Promise<void> {
  await prisma.integration.upsert({
    where: { provider: "google" },
    update: { status: "disconnected", config: {} },
    create: { provider: "google", status: "disconnected" },
  });
}

/* ------------------------------- Data reads ------------------------------- */

export type EmailSummary = { id: string; from: string; subject: string; snippet: string; date: string };

export async function listRecentEmails(token: string, max = 15): Promise<EmailSummary[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=in:inbox`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!listRes.ok) return [];
  const list = await listRes.json();
  const ids: string[] = (list.messages ?? []).map((m: { id: string }) => m.id);

  const emails = await Promise.all(
    ids.map(async (id) => {
      const r = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!r.ok) return null;
      const msg = await r.json();
      const headers: Array<{ name: string; value: string }> = msg.payload?.headers ?? [];
      const h = (n: string) => headers.find((x) => x.name === n)?.value ?? "";
      return {
        id,
        from: h("From"),
        subject: h("Subject") || "(no subject)",
        snippet: msg.snippet ?? "",
        date: h("Date"),
      } as EmailSummary;
    })
  );
  return emails.filter((e): e is EmailSummary => e !== null);
}

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
};

export async function listUpcomingEvents(token: string, max = 20): Promise<CalendarEvent[]> {
  const timeMin = new Date().toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime` +
    `&maxResults=${max}&timeMin=${encodeURIComponent(timeMin)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []).map((e: any) => ({
    id: e.id,
    summary: e.summary ?? "(no title)",
    start: e.start?.dateTime ?? e.start?.date ?? "",
    end: e.end?.dateTime ?? e.end?.date ?? "",
    allDay: Boolean(e.start?.date && !e.start?.dateTime),
    location: e.location,
    htmlLink: e.htmlLink,
  }));
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  iconLink?: string;
};

export async function listRecentFiles(token: string, max = 25): Promise<DriveFile[]> {
  const fields = "files(id,name,mimeType,modifiedTime,webViewLink,iconLink)";
  const url =
    `https://www.googleapis.com/drive/v3/files?orderBy=modifiedTime%20desc&pageSize=${max}` +
    `&fields=${encodeURIComponent(fields)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.files ?? []) as DriveFile[];
}

/* ------------------------------ Write actions ----------------------------- */

type ActionResult = { ok: boolean; error?: string };

export async function sendGmail(
  token: string,
  { to, subject, body }: { to: string; subject: string; body: string }
): Promise<ActionResult> {
  const mime =
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
    body;
  const raw = Buffer.from(mime).toString("base64url");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: err?.error?.message || `Gmail send failed (${res.status})` };
  }
  return { ok: true };
}

export async function createCalendarEvent(
  token: string,
  {
    summary,
    description,
    start,
    end,
  }: { summary: string; description?: string; start: string; end: string }
): Promise<ActionResult & { htmlLink?: string }> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary,
      description,
      start: { dateTime: new Date(start).toISOString() },
      end: { dateTime: new Date(end).toISOString() },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: err?.error?.message || `Event create failed (${res.status})` };
  }
  const event = await res.json();
  return { ok: true, htmlLink: event.htmlLink };
}
