"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-sky-500">
      <div className="bg-white rounded-2xl shadow-2xl p-9 w-96">
        <h1 className="text-2xl font-bold text-blue-800 mb-1">
          PayrollHR <span className="text-sm text-sky-500 font-normal">Singapore · v2</span>
        </h1>
        <p className="text-slate-500 text-sm mb-6">Payroll &amp; Leave Management</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              onKeyDown={e => e.key === "Enter" && handleLogin(e as any)}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn w-full py-3 text-base" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
          <p className="font-semibold mb-1">First time setup:</p>
          <p>Create staff accounts in Supabase Auth, then link them to staff records via the HR → Staff Accounts page.</p>
        </div>
      </div>
    </div>
  );
}
