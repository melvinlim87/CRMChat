import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAIPublicSettings, saveAIConfig, MODEL_CATALOG, type AIProvider } from "@/lib/ai";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: await getAIPublicSettings(), catalog: MODEL_CATALOG });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const provider = body.provider as AIProvider | undefined;
  if (provider && !MODEL_CATALOG[provider]) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  await saveAIConfig({
    provider,
    model: typeof body.model === "string" ? body.model : undefined,
    keys: body.keys,
  });

  return NextResponse.json({ settings: await getAIPublicSettings() });
}
