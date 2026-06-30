"use client";
import { useEffect, useState } from "react";
import { resLabel } from "@/lib/payroll/cpf";

interface StaffMember {
  id: string; name: string; title: string; dept: string; email: string;
  dob: string; residency: string; monthly_wage: number; join_date: string;
  exit_date: string | null; role: string; company_id: string;
  work_days: number[]; community: string; gender: string; nationality: string;
  nric: string; phone: string; address: string; work_area: string;
  work_country: string; other_currency: string; marital_status: string;
  probation_months: number; temp_pw: boolean;
  staff_allowances: { name: string; amount: number }[];
  staff_children: { name: string; dob: string }[];
}

const EMPTY: Partial<StaffMember> = {
  name: "", title: "", dept: "", email: "", dob: "1990-01-01",
  residency: "citizen", monthly_wage: 3000,
  join_date: new Date().toISOString().slice(0, 10),
  exit_date: null, probation_months: 3, community: "chinese", gender: "M",
  nationality: "Singaporean", nric: "", phone: "", address: "",
  work_area: "singapore", work_country: "", other_currency: "", marital_status: "single",
  work_days: [1,2,3,4,5], role: "staff", staff_allowances: [], staff_children: [],
};

function statusInfo(s: StaffMember) {
  const today = new Date();
  const join = s.join_date ? new Date(s.join_date) : null;
  const exit = s.exit_date ? new Date(s.exit_date) : null;
  if (join && join > today) return { label: "Joining " + s.join_date, cls: "badge-info" };
  if (exit && exit < today) return { label: "Resigned", cls: "badge-bad" };
  if (exit) return { label: "Leaving " + s.exit_date, cls: "badge-warn" };
  return { label: "Active", cls: "badge-ok" };
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [editing, setEditing] = useState<Partial<StaffMember> | null>(null);
  const [saving, setSaving] = useState(false);
  const [allows, setAllows] = useState<{ name: string; amount: number }[]>([]);
  const [children, setChildren] = useState<{ name: string; dob: string }[]>([]);

  async function load() {
    const r = await fetch("/api/staff");
    setStaff(await r.json());
  }
  useEffect(() => { load(); }, []);

  function openEdit(s?: StaffMember) {
    setEditing(s ? { ...s } : { ...EMPTY });
    setAllows(s?.staff_allowances ? [...s.staff_allowances] : []);
    setChildren(s?.staff_children ? [...s.staff_children] : []);
  }

  async function save() {
    if (!editing?.name) return alert("Name required");
    setSaving(true);
    await fetch("/api/staff", {
      method: editing.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, allowances: allows, children }),
    });
    setSaving(false); setEditing(null); load();
  }

  function upd(k: string, v: any) { setEditing(e => ({ ...e, [k]: v })); }
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div><h2 className="text-xl font-bold">Staff Directory</h2><p className="text-slate-500 text-sm">{staff.length} employees</p></div>
        <button className="btn" onClick={() => openEdit()}>+ Add Staff</button>
      </div>
      {editing && (
        <div className="panel mb-5">
          <h3 className="font-semibold mb-4">{editing.id ? "Edit" : "Add"} Staff</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {([["Name","name"],["Title","title"],["Department","dept"]] as [string,string][]).map(([l, k]) => (
              <div key={k} className="field"><label>{l}</label>
                <input value={(editing as any)[k] || ""} onChange={e => upd(k, e.target.value)} /></div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="field"><label>Email</label><input type="email" value={editing.email || ""} onChange={e => upd("email", e.target.value)} /></div>
            <div className="field"><label>Date of Birth</label><input type="date" value={editing.dob || ""} onChange={e => upd("dob", e.target.value)} /></div>
            <div className="field"><label>Residency / CPF</label>
              <select value={editing.residency || "citizen"} onChange={e => upd("residency", e.target.value)}>
                <option value="citizen">Citizen</option><option value="pr3">PR (3rd yr+)</option>
                <option value="pr2">PR 2nd yr</option><option value="pr1">PR 1st yr</option>
                <option value="foreigner">Foreigner (no CPF)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="field"><label>Join Date</label><input type="date" value={editing.join_date || ""} onChange={e => upd("join_date", e.target.value)} /></div>
            <div className="field"><label>Last Day (leave blank if active)</label><input type="date" value={editing.exit_date || ""} onChange={e => upd("exit_date", e.target.value || null)} /></div>
            <div className="field"><label>Probation (months)</label><input type="number" value={editing.probation_months ?? 3} onChange={e => upd("probation_months", +e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="field"><label>Basic Salary (monthly)</label><input type="number" value={editing.monthly_wage ?? 3000} onChange={e => upd("monthly_wage", +e.target.value)} /></div>
            <div className="field"><label>Gender</label>
              <select value={editing.gender || "M"} onChange={e => upd("gender", e.target.value)}>
                <option value="M">Male</option><option value="F">Female</option>
              </select>
            </div>
            <div className="field"><label>Community Fund</label>
              <select value={editing.community || "chinese"} onChange={e => upd("community", e.target.value)}>
                <option value="chinese">CDAC (Chinese)</option><option value="malay">MBMF (Malay/Muslim)</option>
                <option value="indian">SINDA (Indian)</option><option value="eurasian">ECF (Eurasian)</option>
                <option value="others">None (Others)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="field"><label>NRIC / FIN</label><input value={editing.nric || ""} onChange={e => upd("nric", e.target.value)} /></div>
            <div className="field"><label>Phone</label><input value={editing.phone || ""} onChange={e => upd("phone", e.target.value)} /></div>
            <div className="field"><label>Marital Status</label>
              <select value={editing.marital_status || "single"} onChange={e => upd("marital_status", e.target.value)}>
                <option value="single">Single</option><option value="married">Married</option>
                <option value="divorced">Divorced</option><option value="widowed">Widowed</option>
              </select>
            </div>
          </div>
          <div className="field mb-4"><label>Residential Address</label><input value={editing.address || ""} onChange={e => upd("address", e.target.value)} /></div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Working Days</label>
            <div className="flex gap-4 flex-wrap">
              {DAYS.map((d, i) => (
                <label key={i} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={(editing.work_days || [1,2,3,4,5]).includes(i)}
                    onChange={e => {
                      const wd = editing.work_days || [1,2,3,4,5];
                      upd("work_days", e.target.checked ? [...wd, i].sort() : wd.filter(x => x !== i));
                    }} />{d}
                </label>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Recurring Allowances</label>
            {allows.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Name" value={a.name} onChange={e => { const n=[...allows]; n[i].name=e.target.value; setAllows(n); }} />
                <input className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm" type="number" value={a.amount} onChange={e => { const n=[...allows]; n[i].amount=+e.target.value; setAllows(n); }} />
                <button className="btn-bad btn-sm btn" onClick={() => setAllows(allows.filter((_,j)=>j!==i))}>✕</button>
              </div>
            ))}
            <button className="btn-sec btn btn-sm" onClick={() => setAllows([...allows,{name:"",amount:0}])}>+ Add Allowance</button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Children</label>
            {children.map((c, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Child name" value={c.name} onChange={e => { const n=[...children]; n[i].name=e.target.value; setChildren(n); }} />
                <input className="w-40 px-3 py-2 border border-slate-200 rounded-lg text-sm" type="date" value={c.dob||""} onChange={e => { const n=[...children]; n[i].dob=e.target.value; setChildren(n); }} />
                <button className="btn-bad btn-sm btn" onClick={() => setChildren(children.filter((_,j)=>j!==i))}>✕</button>
              </div>
            ))}
            <button className="btn-sec btn btn-sm" onClick={() => setChildren([...children,{name:"",dob:""}])}>+ Add Child</button>
          </div>
          <div className="flex gap-3">
            <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="btn-sec btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Name</th><th>Title</th><th>Dept</th><th>Joined</th><th>Status</th><th className="num">Basic</th><th>CPF</th><th></th></tr></thead>
          <tbody>
            {staff.map(s => {
              const st = statusInfo(s);
              return (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}<div className="help">{s.email}</div></td>
                  <td>{s.title}</td><td>{s.dept}</td><td>{s.join_date}</td>
                  <td><span className={st.cls}>{st.label}</span></td>
                  <td className="num font-mono">S${Number(s.monthly_wage).toLocaleString("en-SG",{minimumFractionDigits:2})}</td>
                  <td className="help">{resLabel(s.residency)}</td>
                  <td><button className="btn btn-sec btn-sm" onClick={() => openEdit(s)}>Edit</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
