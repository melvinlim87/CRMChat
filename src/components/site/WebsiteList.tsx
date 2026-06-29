"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Page = { id: string; title: string; slug: string; published: boolean };

export default function WebsiteList({ initial }: { initial: Page[] }) {
  const router = useRouter();
  const [pages, setPages] = useState(initial);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!title.trim() || creating) return;
    setCreating(true);
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setCreating(false);
    if (res.ok) {
      const { page } = await res.json();
      router.push(`/website/${page.id}`);
    }
  }

  async function remove(id: string) {
    setPages((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/pages/${id}`, { method: "DELETE" });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="New page title, e.g. Landing Page"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
        />
        <button onClick={create} disabled={creating || !title.trim()} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
          New page
        </button>
      </div>

      <div className="space-y-3">
        {pages.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 bg-surface-panel px-5 py-12 text-center text-slate-500">
            No pages yet. Create one to start building your website.
          </p>
        )}
        {pages.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-surface-panel p-4">
            <div className="min-w-0">
              <Link href={`/website/${p.id}`} className="font-medium text-slate-100 hover:text-brand-300">{p.title}</Link>
              <p className="mt-0.5 text-sm text-slate-500">
                /p/{p.slug} ·{" "}
                {p.published ? <span className="text-emerald-400">Published</span> : <span className="text-slate-500">Draft</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {p.published && (
                <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5">
                  View ↗
                </a>
              )}
              <Link href={`/website/${p.id}`} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-white/5">Edit</Link>
              <button onClick={() => remove(p.id)} className="text-slate-500 transition hover:text-red-500" title="Delete">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
