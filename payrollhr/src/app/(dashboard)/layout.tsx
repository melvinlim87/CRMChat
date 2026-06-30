import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("id, name, role, dept, title, company_id, temp_pw")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} staff={staffRecord} />
      <main className="ml-60 flex-1 p-7 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
