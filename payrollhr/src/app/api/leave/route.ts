import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const staffId = req.nextUrl.searchParams.get("staff_id");

  let query = supabase.from("leave_applications").select("*, staff(name, dept)").order("created_at", { ascending: false });
  if (staffId) query = query.eq("staff_id", staffId);

  const [{ data: apps }, { data: bf }, { data: used }] = await Promise.all([
    query,
    supabase.from("brought_forward").select("*").eq("year", 2026),
    supabase.from("leave_applications").select("staff_id, leave_type, days").eq("status", "approved"),
  ]);

  return NextResponse.json({ apps, broughtForward: bf, used });
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { action, id, ...data } = body;

  if (action === "apply") {
    const { data: app, error } = await supabase.from("leave_applications").insert(data).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(app);
  }
  if (action === "verify") {
    await supabase.from("leave_applications").update({ verified: true }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "decide") {
    await supabase.from("leave_applications").update({ status: data.status, verified: false }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "cancel") {
    await supabase.from("leave_applications").update({ status: "cancelled", verified: false }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "set_bf") {
    await supabase.from("brought_forward").upsert(
      { staff_id: data.staff_id, leave_type: data.leave_type, year: data.year || 2026, days: data.days, remark: data.remark || "" },
      { onConflict: "staff_id,leave_type,year" }
    );
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
