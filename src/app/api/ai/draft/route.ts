import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateReply, type ChatMessage } from "@/lib/ai";

const SYSTEM = `You are a helpful, friendly sales and support assistant replying to a lead over WhatsApp on behalf of the business.
Write a concise, natural reply to the most recent customer message. Keep it warm and professional, 1-3 short sentences, no markdown, no signatures.`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await req.json().catch(() => ({}));
  if (!conversationId) return NextResponse.json({ error: "conversationId is required" }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      lead: true,
      messages: { orderBy: { createdAt: "asc" }, take: 20 },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  // Map our INBOUND/OUTBOUND history to chat roles (lead = user, us = assistant).
  const messages: ChatMessage[] = conversation.messages.map((m) => ({
    role: m.direction === "INBOUND" ? "user" : "assistant",
    content: m.body,
  }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    messages.push({ role: "user", content: "(The customer is waiting. Write a helpful opening or follow-up.)" });
  }

  const system = `${SYSTEM}\n\nLead name: ${conversation.lead.name}. Company: ${conversation.lead.company ?? "unknown"}.`;
  const result = await generateReply(messages, system);

  if (!result.text) return NextResponse.json({ error: result.error || "No suggestion" }, { status: 502 });
  return NextResponse.json({ suggestion: result.text.trim() });
}
