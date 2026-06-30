"use client";
import { useEffect, useState } from "react";

export default function AnnouncementsPage() {
  const [anns, setAnns] = useState<any[]>([]);
  const [role, setRole] = useState("staff");
  const [companyId, setCompanyId] = useState("");
  const [myName, setMyName] = useState("");
  const [form, setForm] = useState({ title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const meR = await fetch("/api/staff/me");
    const me = await meR.json();
    setRole(me.role); setCompanyId(me.company_id); setMyName(me.name);
    const r = await fetch(`/api/announcements?company_id=${me.company_id}`);
    setAnns(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function publish() {
    if (!form.title || !form.body) return alert("Title and message required");
    setSubmitting(true);
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId, title: form.title, body: form.body, by_name: myName }),
    });
    setForm({ title: "", body: "" }); setSubmitting(false); load();
  }

  async function del(id: string) {
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold">Announcements</h2>
        <p className="text-slate-500 text-sm">Company-wide notices</p>
      </div>
      {role === "hr" && (
        <div className="panel">
          <h3 className="font-semibold mb-4">Publish New</h3>
          <div className="field mb-3"><label>Title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. July payroll schedule" /></div>
          <div className="field mb-4"><label>Message</label><textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></div>
          <button className="btn" onClick={publish} disabled={submitting}>{submitting ? "Publishing…" : "📢 Publish"}</button>
        </div>
      )}
      <div className="panel">
        {anns.length === 0 && <p className="text-slate-400 text-sm">No announcements.</p>}
        {anns.map(a => (
          <div key={a.id} className="border-l-4 border-sky-400 bg-slate-50 rounded-r-lg px-4 py-3 mb-3">
            <div className="font-semibold">{a.title}</div>
            <div className="text-xs text-slate-500 mb-1">{a.by_name} · {new Date(a.created_at).toLocaleDateString()}</div>
            <div className="text-sm">{a.body}</div>
            {role === "hr" && (
              <button className="btn btn-bad btn-sm mt-2" onClick={() => del(a.id)}>Delete</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
