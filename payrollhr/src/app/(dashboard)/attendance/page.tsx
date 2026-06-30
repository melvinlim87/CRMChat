"use client";
import { useEffect, useState } from "react";
import { MONTHS, pad2 } from "@/lib/payroll/cpf";

export default function AttendancePage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [attData, setAttData] = useState<any>({});
  const [selStaff, setSelStaff] = useState<any>(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year] = useState(new Date().getFullYear());
  const [companyId, setCompanyId] = useState("");
  const [holidays, setHolidays] = useState<string[]>([]);

  async function load() {
    const meR = await fetch("/api/staff/me");
    const me = await meR.json();
    setCompanyId(me.company_id);
    const [sR, aR, pR] = await Promise.all([
      fetch(`/api/staff?company_id=${me.company_id}`),
      fetch(`/api/attendance?company_id=${me.company_id}`),
      fetch(`/api/payroll?company_id=${me.company_id}&month=${month}&year=${year}`),
    ]);
    const staffList = await sR.json();
    const att = await aR.json();
    const pd = await pR.json();
    setStaff(staffList);
    setAttData(att);
    setHolidays((pd.holidays || []).map((h: any) => h.holiday_date));
    if (!selStaff && staffList.length) setSelStaff(staffList[0]);
  }
  useEffect(() => { load(); }, [month]);

  async function toggleAbsence(staffId: string, date: string) {
    await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_absence", staff_id: staffId, date }) });
    load();
  }

  async function toggleExtra(staffId: string, date: string) {
    await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_extra", staff_id: staffId, date }) });
    load();
  }

  async function setClock(staffId: string, date: string, field: string, value: string) {
    const existing = (attData.clockData || []).find((c: any) => c.staff_id === staffId && c.clock_date === date) || {};
    await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set_clock", staff_id: staffId, date,
        clock_in: field === "clock_in" ? value : (existing.clock_in || "09:00"),
        clock_out: field === "clock_out" ? value : (existing.clock_out || "18:00"),
      }) });
    load();
  }

  if (!selStaff) return <div className="panel"><p className="text-slate-400">Loading…</p></div>;

  const wh = attData.workHours || { start_time: "09:00", end_time: "18:00" };
  const absences = (attData.absences || []).filter((a: any) => a.staff_id === selStaff.id).map((a: any) => a.absence_date);
  const extraWork = (attData.extraWork || []).filter((e: any) => e.staff_id === selStaff.id).map((e: any) => e.work_date);
  const clockMap: Record<string, any> = {};
  (attData.clockData || []).filter((c: any) => c.staff_id === selStaff.id).forEach((c: any) => { clockMap[c.clock_date] = c; });

  const workDays = selStaff.work_days || [1,2,3,4,5];
  const dim = new Date(year, month + 1, 0).getDate();
  const DN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <div><h2 className="text-xl font-bold">Attendance</h2><p className="text-slate-500 text-sm">Daily clock in/out and overtime</p></div>
        <div className="flex gap-3">
          <select className="px-3 py-2 border border-slate-200 rounded-lg text-sm" value={selStaff?.id || ""} onChange={e => setSelStaff(staff.find(s => s.id === e.target.value))}>
            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="px-3 py-2 border border-slate-200 rounded-lg text-sm" value={month} onChange={e => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m} {year}</option>)}
          </select>
        </div>
      </div>
      <div className="panel overflow-x-auto">
        <h3 className="font-semibold mb-3">{selStaff.name} — {MONTHS[month]} {year}</h3>
        <table className="tbl">
          <thead><tr><th>Date</th><th>Day</th><th>Present</th><th>Clock In</th><th>Clock Out</th><th className="num">OT (hrs)</th></tr></thead>
          <tbody>
            {Array.from({ length: dim }, (_, i) => i + 1).map(d => {
              const dt = new Date(year, month, d);
              const ds = `${year}-${pad2(month + 1)}-${pad2(d)}`;
              const isWork = workDays.includes(dt.getDay()) && !holidays.includes(ds);
              const isHol = holidays.includes(ds);
              const isExtra = extraWork.includes(ds);
              const isAbsent = absences.includes(ds);
              const cd = clockMap[ds] || {};
              if (isWork) {
                const outTime = cd.clock_out || wh.end_time;
                const endH = parseInt(wh.end_time?.split(":")[0] || "18");
                const endM = parseInt(wh.end_time?.split(":")[1] || "0");
                const outH = parseInt(outTime.split(":")[0]);
                const outM = parseInt(outTime.split(":")[1] || "0");
                const ot = isAbsent ? 0 : Math.max(0, ((outH * 60 + outM) - (endH * 60 + endM)) / 60);
                return (
                  <tr key={ds} className={isAbsent ? "bg-red-50" : ""}>
                    <td>{ds}</td><td>{DN[dt.getDay()]}</td>
                    <td><input type="checkbox" checked={!isAbsent} onChange={() => toggleAbsence(selStaff.id, ds)} /> <span className="help">{isAbsent ? "absent" : "work"}</span></td>
                    <td><input type="time" className="px-2 py-1 border border-slate-200 rounded text-sm" defaultValue={cd.clock_in || wh.start_time} disabled={isAbsent} onBlur={e => setClock(selStaff.id, ds, "clock_in", e.target.value)} /></td>
                    <td><input type="time" className="px-2 py-1 border border-slate-200 rounded text-sm" defaultValue={cd.clock_out || wh.end_time} disabled={isAbsent} onBlur={e => setClock(selStaff.id, ds, "clock_out", e.target.value)} /></td>
                    <td className="num">{ot > 0 ? ot.toFixed(1) : "—"}</td>
                  </tr>
                );
              } else {
                return (
                  <tr key={ds} className="bg-slate-50 text-slate-500">
                    <td>{ds}</td>
                    <td>{DN[dt.getDay()]} <span className="help">{isHol ? "Holiday" : "Rest"}</span></td>
                    <td><input type="checkbox" checked={isExtra} onChange={() => toggleExtra(selStaff.id, ds)} /> <span className="help">worked?</span></td>
                    <td><input type="time" className="px-2 py-1 border border-slate-200 rounded text-sm" defaultValue={cd.clock_in || wh.start_time} disabled={!isExtra} onBlur={e => setClock(selStaff.id, ds, "clock_in", e.target.value)} /></td>
                    <td><input type="time" className="px-2 py-1 border border-slate-200 rounded text-sm" defaultValue={cd.clock_out || wh.end_time} disabled={!isExtra} onBlur={e => setClock(selStaff.id, ds, "clock_out", e.target.value)} /></td>
                    <td className="num">—</td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
