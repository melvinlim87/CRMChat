import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { reindexAll } from "@/lib/knowledge";
import { embeddingsAvailable } from "@/lib/ai";

export const runtime = "nodejs";

// Rebuild embeddings for all documents (semantic search).
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await embeddingsAvailable())) {
    return NextResponse.json({ error: "No embeddings provider. Add an OpenAI or Google key in Settings (or use Ollama)." }, { status: 400 });
  }
  const r = await reindexAll();
  return NextResponse.json({ ok: true, ...r });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ available: false });
  return NextResponse.json({ available: await embeddingsAvailable() });
}
