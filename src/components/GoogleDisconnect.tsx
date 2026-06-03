"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GoogleDisconnect() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function disconnect() {
    setLoading(true);
    await fetch("/api/integrations/google/disconnect", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={disconnect}
      disabled={loading}
      className="mt-4 w-full rounded-lg border border-white/10 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-60"
    >
      {loading ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}
