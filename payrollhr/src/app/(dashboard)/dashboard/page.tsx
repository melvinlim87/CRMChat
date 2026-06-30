import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { computePayroll, money, LEAVE_TYPES } from "@/lib/payroll/cpf";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = createServiceClient();
  const { data: me } = await svc.from("staff")
    .select("*, staff_allowances(*), staff_children(*)")
    .eq("user_id", user.id).single();

  if (!me) return (
    <div className="panel">
      <p className="text-slate-500">Your account is not linked to a staff record yet. Please ask HR to link your account.</p>
    </div>
  );

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const [{ data: vars }, { data: absences }, { data: holidays }, { data: workHours }, { data: announcements }, { data: leaveApps }] = await Promise.all([
    svc.from("payroll_vars").select("*").eq("staff_id", me.id).eq("month", month).eq("year", year).single(),
    svc.from("absences").select("absence_date").eq("staff_id", me.id),
    svc.from("company_holidays").select("holiday_date").eq("company_id", me.company_id),
    svc.from("work_hours").select("*").eq("company_id", me.company_id).single(),
    svc.from("announcements").select("*").eq("company_id", me.company_id).order("created_at", { ascending: false }).limit(3),
    svc.from("leave_applications").select("*").eq("staff_id", me.id).eq("status", "pending"),
  ]);

  const allowTotal = (me.staff_allowances || []).reduce((s: number, a: any) => s + Number(a.amount), 0);
  const absenceDates = (absences || []).map((a: any) => a.absence_date);
  const holidayDates = (holidays || []).map((h: any) => h.holiday_date);
  const wh = workHours || { start_time: "09:00", end_time: "18:00" };
  const [sh] = (wh.start_time || "09:00").split(":").map(Number);
  const [eh] = (wh.end_time || "18:00").split(":").map(Number);

  const payroll = computePayroll({
    monthlyWage: Number(me.monthly_wage), allowTotal,
    residency: me.residency, dob: me.dob, community: me.community,
    workDays: me.work_days || [1,2,3,4,5],
    workArea: me.work_area || "singapore",
    holidays: holidayDates, absenceDates,
    otHours: Number(vars?.ot_hours || 0), bonus: Number(vars?.bonus || 0),
    phWorked: Number(vars?.ph_worked || 0),
    normalHours: eh - sh || 9,
    month, year,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Welcome, {me.name.split(" ")[0]}</h2>
          <p className="text-slate-500 text-sm mt-0.5">{me.title} · {me.dept}</p>
        </div>
      </div>

      {me.temp_pw && (
        <div className="banner">
          You are using a temporary password. Go to <Link href="/change-password" className="underline font-semibold">Change Password</Link> to set your own.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-slate-500 font-medium">My Net Pay (est.)</div>
          <div className="text-xl font-bold mt-1">{money(payroll.netPay)}</div>
          <div className="text-xs text-slate-400 mt-0.5">{now.toLocaleString("default", { month: "long" })} {year}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 font-medium">Annual Leave Left</div>
          <div className="text-xl font-bold mt-1">— <span className="text-sm text-slate-400 font-normal">days</span></div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 font-medium">Medical Leave Left</div>
          <div className="text-xl font-bold mt-1">— <span className="text-sm text-slate-400 font-normal">days</span></div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500 font-medium">Pending Requests</div>
          <div className="text-xl font-bold mt-1">{leaveApps?.length || 0}</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="font-semibold mb-4">Latest Announcements</h3>
        {announcements?.length ? announcements.map((a: any) => (
          <div key={a.id} className="border-l-4 border-sky-400 bg-slate-50 rounded-r-lg px-4 py-3 mb-3">
            <div className="font-semibold text-sm">{a.title}</div>
            <div className="text-xs text-slate-500 mb-1">{a.by_name} · {new Date(a.created_at).toLocaleDateString()}</div>
            <div className="text-sm text-slate-700">{a.body}</div>
          </div>
        )) : <p className="text-slate-400 text-sm">No announcements.</p>}
      </div>
    </div>
  );
}
