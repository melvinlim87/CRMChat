"use client";
import { useEffect, useState } from "react";
import { computePayroll, money, MONTHS } from "@/lib/payroll/cpf";

export default function PayrollPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [payData, setPayData] = useState<any>({});
  const [month, setMonth] = useState(new Date().getMonth());
  const [year] = useState(new Date().getFullYear());
  const [companyId, setCompanyId] = useState<string>("");
  const [published, setPublished] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [workHours, setWorkHours] = useState({ start_time: "09:00", end_time: "18:00" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const meR = await fetch("/api/staff/me");
    const me = await meR.json();
    setCompanyId(me.company_id);
    const [sR, pR] = await Promise.all([
      fetch(`/api/staff?company_id=${me.company_id}`),
      fetch(`/api/payroll?company_id=${me.company_id}&month=${month}&year=${year}`),
    ]);
    const staffList = await sR.json();
    const pd = await pR.json();
    setStaff(staffList);
    setPayData(pd);
    setPublished(pd.published || false);
    setHolidays((pd.holidays || []).map((h: any) => h.holiday_date));
    if (pd.workHours) setWorkHours(pd.workHours);
  }
  useEffect(() => { load(); }, [month]);

  function getVars(staffId: string) {
    return (payData.vars || []).find((v: any) => v.staff_id === staffId) || { bonus: 0, ot_hours: 0, ph_worked: 0 };
  }
  function getAbsences(staffId: string) {
    return (payData.absences || []).filter((a: any) => a.staff_id === staffId).map((a: any) => a.absence_date);
  }

  async function updateVar(staffId: string, field: string, value: number) {
    await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert_vars", staff_id: staffId, month, year, [field]: value }),
    });
    load();
  }

  async function togglePublish() {
    setSaving(true);
    await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: published ? "unpublish" : "publish", company_id: companyId, month, year }),
    });
    setSaving(false); load();
  }

  const normalHours = (() => {
    const [sh, sm] = (workHours.start_time || "09:00").split(":").map(Number);
    const [eh, em] = (workHours.end_time || "18:00").split(":").map(Number);
    return (eh * 60 + em - sh * 60 - sm) / 60;
  })();

  const rows = staff.map(s => {
    const v = getVars(s.id);
    const allowTotal = (s.staff_allowances || []).reduce((t: number, a: any) => t + Number(a.amount), 0);
    const p = computePayroll({
      monthlyWage: Number(s.monthly_wage), allowTotal,
      residency: s.residency, dob: s.dob, community: s.community,
      workDays: s.work_days || [1,2,3,4,5], workArea: s.work_area || "singapore",
      holidays, absenceDates: getAbsences(s.id),
      otHours: Number(v.ot_hours || 0), bonus: Number(v.bonus || 0),
      phWorked: Number(v.ph_worked || 0), normalHours, month, year,
    });
    return { s, p, v };
  });

  function sum(k: keyof typeof rows[0]["p"]) {
    return rows.reduce((t, r) => t + (r.p[k] as number), 0);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Run Payroll</h2>
          <p className="text-slate-500 text-sm">Edit OT &amp; Bonus inline</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select className="px-3 py-2 border border-slate-200 rounded-lg text-sm" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m} {year}</option>)}
          </select>
          {published ? <span className="badge-ok">Posted</span> : <span className="badge-warn">Draft</span>}
          <button className="btn" onClick={togglePublish} disabled={saving}>
            {published ? "Reset to Draft" : "Post Payroll"}
          </button>
        </div>
      </div>
      <div className="banner">OW (basic + allowances + OT) CPF capped at S$8,000/mo. Verify community fund tiers vs official tables.</div>
      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead><tr>
            <th>Employee</th><th className="num">Basic</th><th className="num">Allow</th>
            <th>OT (hrs)</th><th>Bonus</th><th className="num">Unpaid</th>
            <th className="num">Gross</th><th className="num">Emp CPF</th><th className="num">Er CPF</th>
            <th className="num">Fund</th><th className="num">SDL</th><th className="num">Net Pay</th>
          </tr></thead>
          <tbody>
            {rows.map(({ s, p, v }) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}<div className="help">{s.residency} · age {p.age}</div></td>
                <td className="num">{money(p.basic)}</td>
                <td className="num">{money(p.allow)}</td>
                <td><input className="w-20 px-2 py-1 border border-slate-200 rounded text-sm text-right" type="number" step="0.5"
                  defaultValue={Number(v.ot_hours || 0)}
                  onBlur={e => updateVar(s.id, "ot_hours", +e.target.value)} /></td>
                <td><input className="w-24 px-2 py-1 border border-slate-200 rounded text-sm text-right" type="number"
                  defaultValue={Number(v.bonus || 0)}
                  onBlur={e => updateVar(s.id, "bonus", +e.target.value)} /></td>
                <td className="num">{p.unpaidDays || 0}</td>
                <td className="num">{money(p.gross)}</td>
                <td className="num">{money(p.empCPF)}</td>
                <td className="num">{money(p.erCPF)}</td>
                <td className="num">{money(p.fund)}</td>
                <td className="num">{money(p.sdl)}</td>
                <td className="num font-bold">{money(p.netPay)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td>Totals</td>
                <td className="num">{money(sum("basic"))}</td>
                <td className="num">{money(sum("allow"))}</td>
                <td></td><td></td>
                <td className="num">{rows.reduce((t, r) => t + (r.p.unpaidDays || 0), 0)}</td>
                <td className="num">{money(sum("gross"))}</td>
                <td className="num">{money(sum("empCPF"))}</td>
                <td className="num">{money(sum("erCPF"))}</td>
                <td className="num">{money(sum("fund"))}</td>
                <td className="num">{money(sum("sdl"))}</td>
                <td className="num">{money(sum("netPay"))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
