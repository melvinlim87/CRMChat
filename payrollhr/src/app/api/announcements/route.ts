import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const companyId = req.nextUrl.searchParams.get("company_id");
  let q = supabase.from("announcements").select("*").order("created_at", { ascending: false });
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { action, id, ...data } = body;
  if (action === "delete") {
    await supabase.from("announcements").delete().eq("id", id);
    return NextResponse.json({ ok: true });
  }
  const { data: ann, error } = await supabase.from("announcements").insert(data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(ann);
}
