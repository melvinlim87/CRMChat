"use client";
import { useEffect, useState } from "react";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/companies");
    setCompanies(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.name) return alert("Company name required");
    setSaving(true);
    await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setSaving(false); setEditing(null); load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-bold">Companies</h2>
          <p className="text-slate-500 text-sm">Manage company profiles</p>
        </div>
        <button className="btn" onClick={() => setEditing({ name: "", address: "" })}>+ Add Company</button>
      </div>
      {editing && (
        <div className="panel mb-5">
          <h3 className="font-semibold mb-4">{editing.id ? "Edit" : "Add"} Company</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="field"><label>Company Name</label><input value={editing.name || ""} onChange={e => setEditing((c: any) => ({ ...c, name: e.target.value }))} /></div>
            <div className="field"><label>Address</label><input value={editing.address || ""} onChange={e => setEditing((c: any) => ({ ...c, address: e.target.value }))} /></div>
          </div>
          <div className="flex gap-3">
            <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="btn-sec btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Company</th><th>Address</th><th></th></tr></thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id}>
                <td className="font-medium">{c.name}</td>
                <td className="help">{c.address}</td>
                <td><button className="btn btn-sec btn-sm" onClick={() => setEditing({ ...c })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
