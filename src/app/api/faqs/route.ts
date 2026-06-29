import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Admin CRUD for FAQs. These feed the AI knowledge base and can be rendered
// on the public site via /api/widget/faqs.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const faqs = await prisma.faq.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ faqs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const question = String(b.question || "").trim();
  const answer = String(b.answer || "").trim();
  if (!question || !answer) {
    return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
  }
  const count = await prisma.faq.count();
  const faq = await prisma.faq.create({
    data: {
      question,
      answer,
      category: typeof b.category === "string" && b.category.trim() ? b.category.trim() : null,
      order: typeof b.order === "number" ? b.order : count,
    },
  });
  return NextResponse.json({ faq });
}
