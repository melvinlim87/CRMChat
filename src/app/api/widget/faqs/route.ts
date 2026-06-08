import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public, read-only FAQ feed for embedding on the customer's own website
// (e.g. the FAQ tab next to the AI Assistant). No auth — same idea as the
// public widget chat endpoint.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const faqs = await prisma.faq.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, question: true, answer: true, category: true },
  });
  return NextResponse.json({ faqs });
}
