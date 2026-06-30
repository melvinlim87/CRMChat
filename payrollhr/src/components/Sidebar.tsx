"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_HR = [
  ["/dashboard", "📊", "Dashboard"],
  ["/payroll", "💵", "Run Payroll"],
  ["/leave", "✅", "Leave Verification"],
  ["/attendance", "🗓️", "Attendance"],
  ["/ir8a", "📄", "Total Remuneration"],
  ["/companies", "🏢", "Companies"],
  ["/staff", "👥", "Staff"],
  ["/accounts", "🔐", "Staff Accounts"],
  ["/entitlements", "⚙️", "Leave Settings"],
  ["/announcements", "📢", "Announcements"],
  ["/change-password", "🔑", "Change Password"],
];

const NAV_STAFF = [
  ["/dashboard", "📊", "Dashboard"],
  ["/profile", "👤", "My Profile"],
  ["/payslips", "🧾", "My Payslips"],
  ["/ir8a", "📄", "Total Remuneration"],
  ["/leave", "📝", "Leave"],
  ["/announcements", "📢", "Announcements"],
  ["/change-password", "🔑", "Change Password"],
];

export default function Sidebar({ user, staff }: { user: any; staff: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const nav = staff?.role === "hr" ? NAV_HR : NAV_STAFF;

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-slate-900 text-slate-300 flex flex-col z-10">
      <div className="px-5 py-5 text-lg font-bold text-white border-b border-slate-800">
        Payroll<span className="text-sky-400">HR</span>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {nav.map(([href, icon, label]) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-5 py-2.5 text-sm border-l-2 transition-colors ${
              pathname === href
                ? "bg-slate-800 text-white border-sky-400"
                : "border-transparent hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span className="w-5 text-center">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-800 text-sm">
        <div className="text-white font-semibold">{staff?.name || user.email}</div>
        <div className="text-slate-400 text-xs capitalize">{staff?.role} · {staff?.dept}</div>
        <button
          onClick={logout}
          className="mt-2 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
