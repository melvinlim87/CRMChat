import { NextRequest, NextResponse } from "next/server";
import { generateReply } from "@/lib/ai";

// Public: classify a visitor message into one of the provided intent options.
// Used by the flow builder's "AI route" node. Returns the chosen index.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { text, options } = await req.json().catch(() => ({}));
  const opts: string[] = Array.isArray(options) ? options.map((o) => String(o)).filter(Boolean) : [];
  if (!text?.trim() || opts.length === 0) return NextResponse.json({ index: 0 });

  const system = "You are an intent router. Choose the single category that best matches the user's message. Reply with ONLY the category number, nothing else.";
  const prompt =
    `Categories:\n${opts.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\n` +
    `User message: "${String(text).trim()}"\n\nAnswer with just the number.`;

  const result = await generateReply([{ role: "user", content: prompt }], system);
  const n = parseInt((result.text || "").match(/\d+/)?.[0] || "1", 10);
  const index = Number.isFinite(n) ? Math.min(Math.max(n - 1, 0), opts.length - 1) : 0;
  return NextResponse.json({ index });
}
