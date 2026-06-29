import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateReply, REPLY_RULES, type ChatMessage } from "@/lib/ai";
import { getKnowledgeContext } from "@/lib/knowledge";

// Used by the flow editor's phone preview to generate a real AI reply,
// grounded in the uploaded knowledge-base PDFs.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, instruction } = await req.json().catch(() => ({}));
  const history: ChatMessage[] = Array.isArray(messages)
    ? messages
        .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
        .slice(-20)
    : [];

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    history.push({ role: "user", content: "(The customer is waiting — write a helpful opening message.)" });
  }

  const knowledge = await getKnowledgeContext();
  const system =
    `You are a helpful sales/support assistant replying to a lead over WhatsApp on behalf of the business. ` +
    `Reply concisely (1-3 short sentences), warm and professional, no markdown. ${REPLY_RULES}` +
    (instruction ? `\n\nExtra instruction: ${instruction}` : "") +
    (knowledge ? `\n\nAnswer using this knowledge base when relevant:\n${knowledge}` : "");

  const result = await generateReply(history, system);
  if (!result.text) return NextResponse.json({ error: result.error || "No reply" }, { status: 502 });
  return NextResponse.json({ reply: result.text.trim(), usedKnowledge: Boolean(knowledge) });
}
