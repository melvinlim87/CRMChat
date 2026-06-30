import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const companyId = req.nextUrl.searchParams.get("company_id");

  const [{ data: absences }, { data: extraWork }, { data: clockData }, { data: workHours }] = await Promise.all([
    supabase.from("absences").select("*"),
    supabase.from("extra_work").select("*"),
    supabase.from("clock_data").select("*"),
    supabase.from("work_hours").select("*").eq("company_id", companyId).single(),
  ]);

  return NextResponse.json({ absences, extraWork, clockData, workHours });
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { action, staff_id, date, company_id, start_time, end_time, clock_in, clock_out } = body;

  if (action === "toggle_absence") {
    const { data: existing } = await supabase.from("absences").select("id").eq("staff_id", staff_id).eq("absence_date", date).single();
    if (existing) {
      await supabase.from("absences").delete().eq("id", existing.id);
    } else {
      await supabase.from("absences").insert({ staff_id, absence_date: date });
    }
    return NextResponse.json({ ok: true });
  }
  if (action === "toggle_extra") {
    const { data: existing } = await supabase.from("extra_work").select("id").eq("staff_id", staff_id).eq("work_date", date).single();
    if (existing) {
      await supabase.from("extra_work").delete().eq("id", existing.id);
    } else {
      await supabase.from("extra_work").insert({ staff_id, work_date: date });
    }
    return NextResponse.json({ ok: true });
  }
  if (action === "set_clock") {
    await supabase.from("clock_data").upsert(
      { staff_id, clock_date: date, clock_in, clock_out },
      { onConflict: "staff_id,clock_date" }
    );
    return NextResponse.json({ ok: true });
  }
  if (action === "set_work_hours") {
    await supabase.from("work_hours").upsert(
      { company_id, start_time, end_time },
      { onConflict: "company_id" }
    );
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
