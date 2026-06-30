import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const companyId = req.nextUrl.searchParams.get("company_id");
  let query = supabase
    .from("staff")
    .select(`*, staff_allowances(*), staff_children(*), staff_documents(*)`)
    .eq("is_system", false)
    .order("name");
  if (companyId) query = query.eq("company_id", companyId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { allowances, children, documents, ...staffData } = body;

  const { data: s, error } = await supabase.from("staff").insert(staffData).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (allowances?.length) {
    await supabase.from("staff_allowances").insert(allowances.map((a: any) => ({ ...a, staff_id: s.id })));
  }
  if (children?.length) {
    await supabase.from("staff_children").insert(children.map((c: any) => ({ ...c, staff_id: s.id })));
  }
  return NextResponse.json(s);
}

export async function PUT(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();
  const { id, allowances, children, documents, ...staffData } = body;

  const { data: s, error } = await supabase.from("staff").update(staffData).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("staff_allowances").delete().eq("staff_id", id);
  if (allowances?.length) {
    await supabase.from("staff_allowances").insert(allowances.map((a: any) => ({ staff_id: id, name: a.name, amount: a.amount })));
  }
  await supabase.from("staff_children").delete().eq("staff_id", id);
  if (children?.length) {
    await supabase.from("staff_children").insert(children.map((c: any) => ({ staff_id: id, name: c.name, dob: c.dob })));
  }
  return NextResponse.json(s);
}
