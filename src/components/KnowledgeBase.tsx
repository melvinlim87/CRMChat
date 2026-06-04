"use client";

import { useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/format";

type Doc = { id: string; name: string; size: number; chars: number; preview: string; createdAt: string };

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function KnowledgeBase() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {});
  }, []);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    for (const file of Array.from(files)) {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      setUploading(false);
      if (res.ok) {
        const { document } = await res.json();
        setDocs((prev) => [document, ...prev]);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Couldn't upload ${file.name}`);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragOver ? "border-brand-400 bg-brand-500/10" : "border-white/15 hover:border-white/25 hover:bg-white/5"
        }`}
      >
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20 text-xl text-brand-300">📄</div>
        <p className="font-medium text-slate-200">{uploading ? "Uploading…" : "Drop a PDF here, or click to browse"}</p>
        <p className="mt-1 text-xs text-slate-500">PDFs up to 8 MB. Text is extracted so your AI can use it.</p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      {/* Document list */}
      <div className="space-y-3">
        {docs.map((d) => (
          <div key={d.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-surface-panel p-4">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-300">PDF</span>
              <div className="min-w-0">
                <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" className="font-medium text-slate-100 hover:text-brand-300">
                  {d.name}
                </a>
                <p className="mt-0.5 text-xs text-slate-500">
                  {fmtSize(d.size)} · {d.chars.toLocaleString()} chars extracted · {timeAgo(d.createdAt)}
                </p>
                {d.preview && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{d.preview}…</p>}
              </div>
            </div>
            <button onClick={() => remove(d.id)} className="shrink-0 text-slate-500 transition hover:text-red-400" title="Delete">✕</button>
          </div>
        ))}
        {docs.length === 0 && !uploading && (
          <p className="rounded-xl border border-dashed border-white/10 bg-surface-panel px-5 py-10 text-center text-slate-500">
            No documents yet. Upload a PDF to build your AI knowledge base.
          </p>
        )}
      </div>
    </div>
  );
}
