"use client";
import { useEffect, useState } from "react";
import { LEAVE_TYPES } from "@/lib/payroll/cpf";

interface LeaveApp {
  id: string; staff_id: string; leave_type: string; from_date: string;
  to_date: string; days: number; reason: string; status: string;
  verified: boolean; applied_at: string;
  staff?: { name: string; dept: string };
}

export default function LeavePage() {
  const [apps, setApps] = useState<LeaveApp[]>([]);
  const [role, setRole] = useState<string>("staff");
  const [myId, setMyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "annual", from: "", to: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const meR = await fetch("/api/staff/me");
    if (meR.ok) {
      const me = await meR.json();
      setRole(me.role); setMyId(me.id);
      const r = await fetch(`/api/leave?staff_id=${me.role === "hr" ? "" : me.id}`);
      const d = await r.json();
      setApps(d.apps || []);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!form.from || !form.to) return alert("Please pick dates");
    setSubmitting(true);
    await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply", staff_id: myId, leave_type: form.type,
        from_date: form.from, to_date: form.to,
        days: Math.round((new Date(form.to).getTime() - new Date(form.from).getTime()) / 86400000) + 1,
        reason: form.reason || "—", status: "approved", verified: false,
        applied_at: new Date().toISOString().slice(0, 10),
      }),
    });
    setSubmitting(false);
    setForm({ type: "annual", from: "", to: "", reason: "" });
    load();
  }

  async function action(id: string, act: string, status?: string) {
    await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, id, status }),
    });
    load();
  }

  const pending = apps.filter(a => a.status === "approved" && !a.verified);
  const done = apps.filter(a => a.status !== "approved" || a.verified);
  const mine = apps.filter(a => a.staff_id === myId);
  function typeName(t: string) { return LEAVE_TYPES.find(x => x.id === t)?.name || t; }
  function statusBadge(s: string) {
    if (s === "approved") return <span className="badge-ok">Approved</span>;
    if (s === "rejected") return <span className="badge-bad">Rejected</span>;
    if (s === "cancelled") return <span className="badge-bad">Cancelled</span>;
    return <span className="badge-warn">Pending</span>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-bold">{role === "hr" ? "Leave Verification" : "My Leave"}</h2>
          <p className="text-slate-500 text-sm">Leave management</p>
        </div>
      </div>
      {role !== "hr" && (
        <div className="panel">
          <h3 className="font-semibold mb-4">Apply for Leave</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="field"><label>Leave type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {LEAVE_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="field"><label>From</label><input type="date" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} /></div>
            <div className="field"><label>To</label><input type="date" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} /></div>
            <div className="field"><label>Reason</label><input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Brief reason" /></div>
          </div>
          <button className="btn" onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit Request"}</button>
        </div>
      )}
      {role === "hr" && (
        <div className="panel">
          <h3 className="font-semibold mb-3">Pending Verification ({pending.length})</h3>
          <table className="tbl">
            <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th className="num">Days</th><th>Reason</th><th>Actions</th></tr></thead>
            <tbody>
              {pending.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-4">Nothing to verify</td></tr>}
              {pending.map(a => (
                <tr key={a.id}>
                  <td className="font-medium">{a.staff?.name}<div className="help">{a.staff?.dept}</div></td>
                  <td>{typeName(a.leave_type)}</td>
                  <td>{a.from_date} → {a.to_date}</td>
                  <td className="num">{a.days}</td>
                  <td className="help">{a.reason}</td>
                  <td className="flex gap-2">
                    <button className="btn btn-ok btn-sm" onClick={() => action(a.id, "verify")}>Verify</button>
                    <button className="btn btn-bad btn-sm" onClick={() => action(a.id, "decide", "rejected")}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="panel">
        <h3 className="font-semibold mb-3">{role === "hr" ? "All Leave Records" : "My Requests"}</h3>
        <table className="tbl">
          <thead><tr>
            {role === "hr" && <th>Employee</th>}
            <th>Type</th><th>Dates</th><th className="num">Days</th><th>Status</th><th>Reason</th><th></th>
          </tr></thead>
          <tbody>
            {(role === "hr" ? done : mine).length === 0 && (
              <tr><td colSpan={7} className="text-center text-slate-400 py-4">No records.</td></tr>
            )}
            {(role === "hr" ? done : mine).map(a => (
              <tr key={a.id}>
                {role === "hr" && <td className="font-medium">{a.staff?.name}</td>}
                <td>{typeName(a.leave_type)}</td>
                <td>{a.from_date} → {a.to_date}</td>
                <td className="num">{a.days}</td>
                <td>{statusBadge(a.status)}{a.verified && <span className="badge-ok ml-1">Verified</span>}</td>
                <td className="help">{a.reason}</td>
                <td>{a.status === "approved" && a.staff_id === myId && (
                  <button className="btn btn-bad btn-sm" onClick={() => action(a.id, "cancel")}>Cancel</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
