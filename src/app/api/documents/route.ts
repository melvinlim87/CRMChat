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
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 8 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const audienceRaw = String(formData?.get("audience") || "all");
  const audience = ["all", "public", "student"].includes(audienceRaw) ? audienceRaw : "all";

  let text = "";
  try {
    const parsed = await pdfParse(buffer);
    text = (parsed.text || "").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return NextResponse.json({ error: "Couldn't read that PDF" }, { status: 400 });
  }

  const doc = await prisma.document.create({
    data: { name: file.name, mimeType: "application/pdf", size: file.size, text, content: buffer, audience },
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
