import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resLabel, fundName } from "@/lib/payroll/cpf";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const svc = createServiceClient();
  const { data: me } = await svc.from("staff")
    .select("*, staff_allowances(*), staff_children(*), staff_documents(*)")
    .eq("user_id", user.id).single();

  if (!me) return <div className="panel"><p className="text-slate-500">Profile not found. Contact HR.</p></div>;

  function row(label: string, value: string | null) {
    return (
      <div className="flex justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
        <span className="text-slate-500 w-40 shrink-0">{label}</span>
        <span className="font-medium text-right">{value || "—"}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold">My Profile</h2>
        <p className="text-slate-500 text-sm">Read-only — contact HR to update</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="panel">
          <h3 className="font-semibold mb-3">Personal</h3>
          {row("Full name", me.name)}
          {row("NRIC / FIN", me.nric)}
          {row("Gender", me.gender === "F" ? "Female" : "Male")}
          {row("Date of birth", me.dob)}
          {row("Nationality", me.nationality)}
          {row("CPF status", resLabel(me.residency))}
          {row("Contact number", me.phone)}
          {row("Residential address", me.address)}
          {row("Marital status", me.marital_status)}
          {row("Children", me.staff_children?.map((c: any) => `${c.name} (${c.dob})`).join(", ") || "None")}
        </div>
        <div className="panel">
          <h3 className="font-semibold mb-3">Employment</h3>
          {row("Designation", me.title)}
          {row("Department", me.dept)}
          {row("Role", me.role)}
          {row("Working area", me.work_area === "oversea" ? `Oversea — ${me.work_country}` : "Singapore")}
          {row("Working days/week", String((me.work_days || [1,2,3,4,5]).length))}
          {row("Community fund", fundName(me.community) || "None")}
          {row("Date joined", me.join_date)}
          {row("Probation (months)", String(me.probation_months ?? 3))}
          {row("Last day", me.exit_date)}
          <div className="mt-3">
            <div className="text-sm text-slate-500 mb-1">Allowances</div>
            {me.staff_allowances?.length ? me.staff_allowances.map((a: any, i: number) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>{a.name}</span>
                <span className="font-mono">S${Number(a.amount).toLocaleString("en-SG", { minimumFractionDigits: 2 })}</span>
              </div>
            )) : <p className="text-sm text-slate-400">No allowances</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
