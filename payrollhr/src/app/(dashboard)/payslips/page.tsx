"use client";
import { useEffect, useState } from "react";
import { computePayroll, money, MONTHS, fundName, resLabel } from "@/lib/payroll/cpf";

export default function PayslipsPage() {
  const [me, setMe] = useState<any>(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year] = useState(new Date().getFullYear());
  const [payData, setPayData] = useState<any>({});
  const [company, setCompany] = useState<any>(null);

  async function load() {
    const meData = await (await fetch("/api/staff/me")).json();
    setMe(meData);
    const [pd, cos] = await Promise.all([
      (await fetch(`/api/payroll?company_id=${meData.company_id}&month=${month}&year=${year}`)).json(),
      (await fetch("/api/companies")).json(),
    ]);
    setPayData(pd);
    setCompany(cos.find((c: any) => c.id === meData.company_id));
  }
  useEffect(() => { load(); }, [month]);

  if (!me) return <div className="panel"><p className="text-slate-400">Loading…</p></div>;
  if (!payData.published) return (
    <div>
      <div className="mb-5"><h2 className="text-xl font-bold">My Payslips</h2></div>
      <div className="panel"><div className="banner">No payslip posted yet for this month.</div></div>
    </div>
  );

  const v = (payData.vars || []).find((x: any) => x.staff_id === me.id) || {};
  const absenceDates = (payData.absences || []).filter((a: any) => a.staff_id === me.id).map((a: any) => a.absence_date);
  const holidays = (payData.holidays || []).map((h: any) => h.holiday_date);
  const allowTotal = (me.staff_allowances || []).reduce((s: number, a: any) => s + Number(a.amount), 0);
  const wh = payData.workHours || { start_time: "09:00", end_time: "18:00" };
  const [sh] = (wh.start_time || "09:00").split(":").map(Number);
  const [eh] = (wh.end_time || "18:00").split(":").map(Number);

  const p = computePayroll({
    monthlyWage: Number(me.monthly_wage), allowTotal,
    residency: me.residency, dob: me.dob, community: me.community,
    workDays: me.work_days || [1,2,3,4,5], workArea: me.work_area || "singapore",
    holidays, absenceDates, otHours: Number(v.ot_hours || 0), bonus: Number(v.bonus || 0),
    phWorked: Number(v.ph_worked || 0), normalHours: eh - sh, month, year,
  });

  const foreigner = me.residency === "foreigner";

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div><h2 className="text-xl font-bold">My Payslips</h2></div>
        <select className="px-3 py-2 border border-slate-200 rounded-lg text-sm" value={month} onChange={e => setMonth(+e.target.value)}>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m} {year}</option>)}
        </select>
      </div>
      <div className="panel max-w-2xl print-area">
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-4">
          <div>
            <div className="font-bold text-lg">{company?.name}</div>
            <div className="text-xs text-slate-500">{company?.address}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">Payslip — {MONTHS[month]} {year}</div>
            <div className="text-sm text-slate-500">{me.name} · NRIC: {me.nric || "—"}</div>
          </div>
        </div>
        <div className="text-xs uppercase text-slate-500 font-bold mt-4 mb-1">Earnings</div>
        {[
          ["Basic salary", p.basic],
          ...(me.staff_allowances || []).map((a: any) => [a.name + " allowance", Number(a.amount)]),
          ...(p.unpaidDays > 0 ? [["Less: unpaid leave (" + p.unpaidDays + "d)", -(p.basic + p.allow - p.proratedRecurring)]] : []),
          ...(p.phWorked ? [["Public holiday pay (" + p.phWorked + "d)", p.phPay]] : []),
          ...(p.ot ? [["Overtime (" + Number(v.ot_hours || 0).toFixed(1) + "h @1.5x)", p.ot]] : []),
          ...(p.bonus ? [["Bonus (Additional Wage)", p.bonus]] : []),
        ].map(([label, amt], i) => (
          <div key={i} className="flex justify-between py-1.5 border-b border-dashed border-slate-200 text-sm">
            <span>{label as string}</span>
            <span className="font-mono">{(amt as number) < 0 ? "− " + money(Math.abs(amt as number)) : money(amt as number)}</span>
          </div>
        ))}
        <div className="flex justify-between py-2.5 border-b-2 border-slate-800 font-bold text-base">
          <span>Gross pay</span><span className="font-mono">{money(p.gross)}</span>
        </div>
        <div className="text-xs uppercase text-slate-500 font-bold mt-4 mb-1">Deductions</div>
        {foreigner ? (
          <div className="text-sm text-slate-400 py-1">No CPF / community fund (foreigner)</div>
        ) : (
          <>
            <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200 text-sm">
              <span>CPF ({(p.rEmp * 100).toFixed(1)}%)</span>
              <span className="font-mono">− {money(p.empCPF)}</span>
            </div>
            {p.fund > 0 && (
              <div className="flex justify-between py-1.5 border-b border-dashed border-slate-200 text-sm">
                <span>{p.fundLabel} fund</span>
                <span className="font-mono">− {money(p.fund)}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between py-2.5 border-b-2 border-slate-800 font-bold text-base">
          <span>Net pay</span><span className="font-mono">{money(p.netPay)}</span>
        </div>
        {!foreigner && (
          <>
            <div className="text-xs uppercase text-slate-500 font-bold mt-4 mb-1">Employer Contributions (not deducted)</div>
            <div className="flex justify-between py-1.5 text-sm"><span>Employer CPF ({(p.rEr * 100).toFixed(1)}%)</span><span className="font-mono">{money(p.erCPF)}</span></div>
            <div className="flex justify-between py-1.5 text-sm"><span>SDL</span><span className="font-mono">{money(p.sdl)}</span></div>
            <div className="flex justify-between py-1.5 text-sm font-semibold"><span>Total CPF (emp + er)</span><span className="font-mono">{money(p.totalCPF)}</span></div>
          </>
        )}
        <div className="no-print mt-5">
          <button className="btn-sec btn btn-sm" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>
    </div>
  );
}
