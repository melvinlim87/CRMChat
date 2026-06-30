"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) { setMsg({ text: "New password must be at least 8 characters", ok: false }); return; }
    if (next !== confirm) { setMsg({ text: "Passwords do not match", ok: false }); return; }
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (error) setMsg({ text: error.message, ok: false });
    else {
      setMsg({ text: "Password updated successfully!", ok: true });
      setNext(""); setConfirm("");
      await fetch("/api/staff/me/clear-temp-pw", { method: "POST" });
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold">Change Password</h2>
        <p className="text-slate-500 text-sm">Update your sign-in password</p>
      </div>
      <div className="panel max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <div className="field"><label>New Password</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="Min 8 characters" required /></div>
          <div className="field"><label>Confirm New Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password" required /></div>
          {msg && <p className={msg.ok ? "text-green-600 text-sm" : "text-red-600 text-sm"}>{msg.text}</p>}
          <button type="submit" className="btn w-full" disabled={loading}>{loading ? "Updating…" : "Update Password"}</button>
        </form>
      </div>
    </div>
  );
}
