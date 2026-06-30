import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const companyId = req.nextUrl.searchParams.get("company_id");
  const month = req.nextUrl.searchParams.get("month");
  const year = req.nextUrl.searchParams.get("year");

  const [{ data: vars }, { data: published }, { data: absences }, { data: extraWork }, { data: clockData }, { data: workHours }, { data: holidays }] = await Promise.all([
    supabase.from("payroll_vars").select("*").eq("month", month).eq("year", year),
    supabase.from("payroll_published").select("*").eq("company_id", companyId).eq("month", month).eq("year", year).single(),
    supabase.from("absences").select("*"),
    supabase.from("extra_work").select("*"),
    supabase.from("clock_data").select("*"),
    supabase.from("work_hours").select("*").eq("company_id", companyId).single(),
    supabase.from("company_holidays").select("*").eq("company_id", companyId),
  ]);

  return NextResponse.json({ vars, published: published?.published || false, absences, extraWork, clockData, workHours, holidays });
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { action, company_id, month, year, staff_id, bonus, ot_hours } = body;

  if (action === "publish" || action === "unpublish") {
    await supabase.from("payroll_published").upsert({
      company_id, month, year,
      published: action === "publish",
      published_at: action === "publish" ? new Date().toISOString() : null,
    }, { onConflict: "company_id,month,year" });
    return NextResponse.json({ ok: true });
  }

  if (action === "upsert_vars") {
    await supabase.from("payroll_vars").upsert(
      { staff_id, month, year, bonus: bonus || 0, ot_hours: ot_hours || 0 },
      { onConflict: "staff_id,month,year" }
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
