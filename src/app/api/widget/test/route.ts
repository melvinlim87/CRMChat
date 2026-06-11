import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateReply, REPLY_RULES, type AIProvider } from "@/lib/ai";
import { getKnowledgeContext } from "@/lib/knowledge";
import { toneGuidance } from "@/lib/widget";

export const runtime = "nodejs";

// Admin "validate the agent" console: run a one-off query against the knowledge
// base with a chosen model + tone, to test answers before going live.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, provider, model, tone } = await req.json().catch(() => ({}));
  if (!query?.trim()) return NextResponse.json({ error: "Query is required" }, { status: 400 });

  const knowledge = await getKnowledgeContext();
  const system =
    `You are the AI assistant on a company's website. Answer the question clearly and naturally. ${toneGuidance(tone)} No markdown. ` +
    `Only answer using the knowledge base below and say so if it isn't covered. ${REPLY_RULES}` +
    (knowledge ? `\n\nKnowledge base:\n${knowledge}` : "");

  const result = await generateReply([{ role: "user", content: query.trim() }], system, {
    provider: provider as AIProvider | undefined,
    model: typeof model === "string" ? model : undefined,
  });

  // Log the test query so it shows under "Recent queries".
  await prisma.aiTestQuery.create({ data: { query: query.trim(), answer: result.text ?? "" } }).catch(() => {});

  return NextResponse.json({ text: result.text, error: result.error });
}

// Recent test queries (and recent real visitor questions) for the side list.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ recent: [] });

  const recent = await prisma.aiTestQuery.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, query: true, createdAt: true },
  });
  return NextResponse.json({
    recent: recent.map((r) => ({ id: r.id, query: r.query, createdAt: r.createdAt.toISOString() })),
  });
}
