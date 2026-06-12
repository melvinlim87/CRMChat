import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, size: true, text: true, audience: true, createdAt: true },
  });
  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      name: d.name,
      size: d.size,
      chars: d.text.length,
      preview: d.text.slice(0, 160),
      audience: d.audience,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const lower = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
  const isHtml = file.type === "text/html" || lower.endsWith(".html") || lower.endsWith(".htm");
  const isText =
    file.type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown");
  if (!isPdf && !isHtml && !isText) {
    return NextResponse.json({ error: "Supported types: PDF, HTML, TXT, Markdown" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 8 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const audienceRaw = String(formData?.get("audience") || "all");
  const audience = ["all", "public", "student"].includes(audienceRaw) ? audienceRaw : "all";

  let text = "";
  let mimeType = "text/plain";
  try {
    if (isPdf) {
      mimeType = "application/pdf";
      const parsed = await pdfParse(buffer);
      text = parsed.text || "";
    } else if (isHtml) {
      mimeType = "text/html";
      text = htmlToText(buffer.toString("utf8"));
    } else {
      text = buffer.toString("utf8");
    }
    text = text.replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return NextResponse.json({ error: "Couldn't read that file" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "No readable text found in that file" }, { status: 400 });

  const doc = await prisma.document.create({
    data: { name: file.name, mimeType, size: file.size, text, content: buffer, audience },
    select: { id: true, name: true, size: true, text: true, audience: true, createdAt: true },
  });

  return NextResponse.json({
    document: {
      id: doc.id,
      name: doc.name,
      size: doc.size,
      chars: doc.text.length,
      preview: doc.text.slice(0, 160),
      audience: doc.audience,
      createdAt: doc.createdAt.toISOString(),
    },
  });
}

// Strip HTML down to readable plain text for the knowledge base.
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#3?9;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}
