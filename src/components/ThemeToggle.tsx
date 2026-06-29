"use client";

import { useEffect, useState } from "react";

// Toggles the admin between dark (default) and light. The choice is persisted
// and also applied pre-paint by an inline script in the root layout.
export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("theme-light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("theme-light", next);
    try {
      localStorage.setItem("crmchat_admin_theme", next ? "light" : "dark");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
      title="Toggle light / dark"
    >
      <span className="text-[18px] leading-none">{light ? "☀️" : "🌙"}</span>
      {light ? "Light mode" : "Dark mode"}
    </button>
  );
}
