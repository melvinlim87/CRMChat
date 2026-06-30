"use client";
import { useEffect, useState } from "react";
import { computePayroll, money, MONTHS, round2 } from "@/lib/payroll/cpf";

export default function IR8APage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [payData, setPayData] = useState<any>({});
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("staff");
  const [myId, setMyId] = useState("");
  const [year] = useState(2026);
  const [fromMonth, setFromMonth] = useState(0);
  const [toMonth, setToMonth] = useState(new Date().getMonth() - 1);

  async function load() {
    const meR = await fetch("/api/staff/me");
    const me = await meR.json();
    setRole(me.role); setMyId(me.id); setCompanyId(me.company_id);
    const staffList = await (await fetch(`/api/staff?company_id=${me.company_id}`)).json();
    setStaff(staffList);
    const results: any = {};
    for (let m = 0; m <= 11; m++) {
      const r = await fetch(`/api/payroll?company_id=${me.company_id}&month=${m}&year=${year}`);
      results[m] = await r.json();
    }
    setPayData(results);
  }
  useEffect(() => { load(); }, []);

  function rangeFig(s: any) {
    const totals = { basic: 0, allow: 0, ot: 0, bonus: 0, gross: 0, empCPF: 0, erCPF: 0, fund: 0, netPay: 0 };
    for (let m = fromMonth; m <= toMonth; m++) {
      const pd = payData[m];
      if (!pd) continue;
      const v = (pd.vars || []).find((x: any) => x.staff_id === s.id) || {};
      const absenceDates = (pd.absences || []).filter((a: any) => a.staff_id === s.id).map((a: any) => a.absence_date);
      const holidays = (pd.holidays || []).map((h: any) => h.holiday_date);
      const allowTotal = (s.staff_allowances || []).reduce((t: number, a: any) => t + Number(a.amount), 0);
      const wh = pd.workHours || { start_time: "09:00", end_time: "18:00" };
      const [sh] = (wh.start_time || "09:00").split(":").map(Number);
      const [eh] = (wh.end_time || "18:00").split(":").map(Number);
      const p = computePayroll({
        monthlyWage: Number(s.monthly_wage), allowTotal,
        residency: s.residency, dob: s.dob, community: s.community,
        workDays: s.work_days || [1,2,3,4,5], workArea: s.work_area || "singapore",
        holidays, absenceDates, otHours: Number(v.ot_hours || 0), bonus: Number(v.bonus || 0),
        phWorked: Number(v.ph_worked || 0), normalHours: eh - sh, month: m, year,
      });
      totals.basic += p.basic; totals.allow += p.allow; totals.ot += p.ot;
      totals.bonus += p.bonus; totals.gross += p.gross; totals.empCPF += p.empCPF;
      totals.erCPF += p.erCPF; totals.fund += p.fund; totals.netPay += p.netPay;
    }
    return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, round2(v as number)]));
  }

  const displayStaff = role === "hr" ? staff : staff.filter(s => s.id === myId);

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Total Remuneration for the Year</h2>
          <p className="text-slate-500 text-sm">IR8A — {year}</p>
        </div>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-slate-500">From</span>
          <select className="px-2 py-1.5 border border-slate-200 rounded-lg" value={fromMonth} onChange={e => setFromMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <span className="text-slate-500">To</span>
          <select className="px-2 py-1.5 border border-slate-200 rounded-lg" value={toMonth} onChange={e => setToMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="banner">Total remuneration (IR8A) — {MONTHS[fromMonth]}–{MONTHS[toMonth]} {year}. Verify before filing with IRAS.</div>
      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead><tr>
            <th>Employee</th><th className="num">Basic</th><th className="num">Allowances</th>
            <th className="num">Overtime</th><th className="num">Bonus</th><th className="num">Fund</th>
            <th className="num">Total Income</th><th className="num">Employee CPF</th>
          </tr></thead>
          <tbody>
            {displayStaff.map(s => {
              const f = rangeFig(s);
              return (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}<div className="help">NRIC/FIN {s.nric || "—"} · {s.nationality || "—"}</div></td>
                  <td className="num">{money(f.basic)}</td>
                  <td className="num">{money(f.allow)}</td>
                  <td className="num">{money(f.ot)}</td>
                  <td className="num">{money(f.bonus)}</td>
                  <td className="num">{money(f.fund)}</td>
                  <td className="num font-bold">{money(f.gross)}</td>
                  <td className="num">{money(f.empCPF)}</td>
                </tr>
              );
            })}
          </tbody>
          {role === "hr" && displayStaff.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td>Totals</td>
                {["basic","allow","ot","bonus","fund","gross","empCPF"].map(k => (
                  <td key={k} className="num">{money(displayStaff.reduce((t, s) => t + (rangeFig(s) as any)[k], 0))}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
