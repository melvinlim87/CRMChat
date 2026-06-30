import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const companyId = req.nextUrl.searchParams.get("company_id");
  const [{ data: companyEnt }, { data: staffEnt }, { data: bf }] = await Promise.all([
    supabase.from("leave_entitlements").select("*").eq("company_id", companyId),
    supabase.from("staff_entitlements").select("*"),
    supabase.from("brought_forward").select("*").eq("year", 2026),
  ]);
  return NextResponse.json({ companyEnt, staffEnt, broughtForward: bf });
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { action, company_id, entries } = body;

  if (action === "save_company_defaults") {
    for (const e of entries) {
      await supabase.from("leave_entitlements").upsert(
        { company_id, leave_type: e.leave_type, days: e.days },
        { onConflict: "company_id,leave_type" }
      );
    }
    return NextResponse.json({ ok: true });
  }
  if (action === "save_staff_entitlements") {
    for (const e of entries) {
      if (e.days !== null && e.days !== "") {
        await supabase.from("staff_entitlements").upsert(
          { staff_id: e.staff_id, leave_type: e.leave_type, days: e.days },
          { onConflict: "staff_id,leave_type" }
        );
      } else {
        await supabase.from("staff_entitlements").delete()
          .eq("staff_id", e.staff_id).eq("leave_type", e.leave_type);
      }
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
