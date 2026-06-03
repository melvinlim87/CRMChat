import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const flows = await prisma.flow.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ flows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // Seed every new flow with a trigger node so the canvas isn't empty.
  const graph = {
    nodes: [
      {
        id: "trigger",
        type: "trigger",
        position: { x: 240, y: 40 },
        data: {},
        deletable: false,
      },
    ],
    edges: [],
  };

  const flow = await prisma.flow.create({
    data: { name: name.trim(), graph },
  });
  return NextResponse.json({ flow });
}
