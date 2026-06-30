"use client";
import { useEffect, useState } from "react";
import { LEAVE_TYPES } from "@/lib/payroll/cpf";

export default function EntitlementsPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [companyEnt, setCompanyEnt] = useState<Record<string, number>>({});
  const [staffEnt, setStaffEnt] = useState<Record<string, Record<string, number | null>>>({});
  const [companyId, setCompanyId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const meR = await fetch("/api/staff/me");
    const me = await meR.json();
    setCompanyId(me.company_id);
    const [sR, eR] = await Promise.all([
      fetch(`/api/staff?company_id=${me.company_id}`),
      fetch(`/api/entitlements?company_id=${me.company_id}`),
    ]);
    const staffList = await sR.json();
    const entData = await eR.json();
    setStaff(staffList);
    const ce: Record<string, number> = {};
    (entData.companyEnt || []).forEach((e: any) => { ce[e.leave_type] = e.days; });
    setCompanyEnt(ce);
    const se: Record<string, Record<string, number | null>> = {};
    (entData.staffEnt || []).forEach((e: any) => {
      se[e.staff_id] = se[e.staff_id] || {};
      se[e.staff_id][e.leave_type] = e.days;
    });
    setStaffEnt(se);
  }
  useEffect(() => { load(); }, []);

  async function saveDefaults() {
    setSaving(true);
    await fetch("/api/entitlements", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_company_defaults", company_id: companyId,
        entries: Object.entries(companyEnt).map(([leave_type, days]) => ({ leave_type, days })) }) });
    setSaving(false);
  }

  async function saveGrid() {
    setSaving(true);
    const entries: any[] = [];
    staff.forEach(s => {
      LEAVE_TYPES.forEach(t => {
        entries.push({ staff_id: s.id, leave_type: t.id, days: staffEnt[s.id]?.[t.id] ?? null });
      });
    });
    await fetch("/api/entitlements", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_staff_entitlements", entries }) });
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold">Leave Settings</h2>
        <p className="text-slate-500 text-sm">Company defaults + per-staff overrides</p>
      </div>
      <div className="banner">Company defaults apply to all staff. Per-staff grid overrides individual entitlements.</div>
      <div className="panel">
        <h3 className="font-semibold mb-4">Company Default Entitlements (days/year)</h3>
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {LEAVE_TYPES.map(t => (
            <div key={t.id} className="field">
              <label><span className="inline-block w-2.5 h-2.5 rounded mr-1" style={{ background: t.color }}></span>{t.name}</label>
              <input type="number" value={companyEnt[t.id] ?? ""} onChange={e => setCompanyEnt(c => ({ ...c, [t.id]: +e.target.value }))} />
            </div>
          ))}
        </div>
        <button className="btn" onClick={saveDefaults} disabled={saving}>Save Defaults</button>
      </div>
      <div className="panel overflow-x-auto">
        <h3 className="font-semibold mb-4">Per-Staff Entitlements (blank = company default)</h3>
        <table className="tbl">
          <thead><tr>
            <th>Employee</th>
            {LEAVE_TYPES.map(t => <th key={t.id} className="num text-xs">{t.name.split(" ")[0]}</th>)}
          </tr></thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}<div className="help">{s.dept}</div></td>
                {LEAVE_TYPES.map(t => (
                  <td key={t.id}>
                    <input className="w-14 px-1.5 py-1 border border-slate-200 rounded text-xs text-center"
                      type="number" placeholder={String(companyEnt[t.id] ?? "")}
                      value={staffEnt[s.id]?.[t.id] ?? ""}
                      onChange={e => setStaffEnt(se => ({
                        ...se, [s.id]: { ...(se[s.id] || {}), [t.id]: e.target.value === "" ? null : +e.target.value }
                      }))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4">
          <button className="btn" onClick={saveGrid} disabled={saving}>Save Per-Staff Entitlements</button>
        </div>
      </div>
    </div>
  );
}
