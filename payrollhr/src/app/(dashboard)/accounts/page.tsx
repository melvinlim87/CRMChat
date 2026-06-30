"use client";
import { useEffect, useState } from "react";

export default function AccountsPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/staff");
    setStaff(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function linkAccount(staffId: string, userId: string) {
    await fetch("/api/staff", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: staffId, user_id: userId }),
    });
    setMsg("Account linked!"); load();
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold">Staff Sign-in Accounts</h2>
        <p className="text-slate-500 text-sm">Manage Supabase Auth logins for staff</p>
      </div>
      <div className="banner-info">
        <b>How to add a staff login:</b>
        <ol className="list-decimal ml-4 mt-1 space-y-1 text-sm">
          <li>Go to your <b>Supabase dashboard → Authentication → Users</b></li>
          <li>Click <b>&ldquo;Invite user&rdquo;</b> and enter the staff member&apos;s email</li>
          <li>They will receive an email to set their own password</li>
          <li>Once they sign up, copy their <b>User UID</b> from the Supabase Auth Users table</li>
          <li>Paste it in the <b>User ID</b> field below next to their staff record</li>
        </ol>
      </div>
      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Employee</th><th>Dept</th><th>Role</th><th>Auth linked?</th><th>Link User ID</th></tr></thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}<div className="help">{s.email}</div></td>
                <td>{s.dept}</td>
                <td><span className={s.role === "hr" ? "badge-info" : "badge-ok"}>{s.role}</span></td>
                <td>{s.user_id ? <span className="badge-ok">✓ Linked</span> : <span className="badge-warn">Not linked</span>}</td>
                <td>
                  <div className="flex gap-2">
                    <input
                      className="px-2 py-1 border border-slate-200 rounded text-xs w-56"
                      placeholder="Paste Supabase User UID"
                      id={`uid-${s.id}`}
                    />
                    <button className="btn btn-sm" onClick={() => {
                      const el = document.getElementById(`uid-${s.id}`) as HTMLInputElement;
                      if (el?.value) linkAccount(s.id, el.value);
                    }}>Link</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg && <p className="text-green-600 text-sm mt-2">{msg}</p>}
    </div>
  );
}
