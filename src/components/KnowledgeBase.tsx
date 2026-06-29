"use client";

import { useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/format";

type Doc = { id: string; name: string; size: number; chars: number; preview: string; audience: string; createdAt: string };

const AUDIENCES: { key: string; label: string; cls: string }[] = [
  { key: "all", label: "Everyone", cls: "bg-slate-500/15 text-slate-300" },
  { key: "public", label: "General only", cls: "bg-amber-500/15 text-amber-300" },
  { key: "student", label: "Students only", cls: "bg-violet-500/15 text-violet-300" },
];
const audienceMeta = (a: string) => AUDIENCES.find((x) => x.key === a) ?? AUDIENCES[0];

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
  const [audience, setAudience] = useState("all");
  const [semantic, setSemantic] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [reindexMsg, setReindexMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => {});
    fetch("/api/documents/reindex")
      .then((r) => r.json())
      .then((d) => setSemantic(Boolean(d.available)))
      .catch(() => {});
  }, []);

  async function reindex() {
    setReindexing(true);
    setReindexMsg("");
    const res = await fetch("/api/documents/reindex", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setReindexing(false);
    setReindexMsg(res.ok ? `Indexed ${d.chunks} chunks ✓` : d.error || "Reindex failed");
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    for (const file of Array.from(files)) {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("audience", audience);
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

  async function changeAudience(id: string, value: string) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, audience: value } : d)));
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience: value }),
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Semantic search status */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
        <span className="text-xs text-slate-400">
          {semantic ? "🔎 Semantic search is on — answers find the right section by meaning." : "🔎 Semantic search off — add an OpenAI or Google key in Settings to enable it (keyword search is used meanwhile)."}
        </span>
        {semantic && (
          <div className="flex items-center gap-2">
            {reindexMsg && <span className="text-[11px] text-emerald-400">{reindexMsg}</span>}
            <button onClick={reindex} disabled={reindexing} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/5 disabled:opacity-50">
              {reindexing ? "Indexing…" : "Reindex existing docs"}
            </button>
          </div>
        )}
      </div>

      {/* Who is this upload for? */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-400">Upload for</span>
        {AUDIENCES.map((a) => (
          <button
            key={a.key}
            onClick={() => setAudience(a.key)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              audience === a.key ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-white/10 text-slate-300 hover:bg-white/5"
            }`}
          >
            {a.key === "all" ? "Everyone" : a.key === "public" ? "General enquiry" : "Verified students"}
          </button>
        ))}
      </div>

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
        <input ref={inputRef} type="file" accept=".pdf,.html,.htm,.txt,.md,.markdown,application/pdf,text/html,text/plain,text/markdown" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20 text-xl text-brand-300">📄</div>
        <p className="font-medium text-slate-200">{uploading ? "Uploading…" : "Drop a file here, or click to browse"}</p>
        <p className="mt-1 text-xs text-slate-500">PDF, HTML, TXT or Markdown up to 8 MB. HTML/text import instantly; PDFs take a little longer.</p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      {/* Document list */}
      <div className="space-y-3">
        {docs.map((d) => (
          <div key={d.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-surface-panel p-4">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-[10px] font-semibold text-brand-300">{(d.name.split(".").pop() || "DOC").toUpperCase().slice(0, 4)}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" className="font-medium text-slate-100 hover:text-brand-300">
                    {d.name}
                  </a>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${audienceMeta(d.audience).cls}`}>{audienceMeta(d.audience).label}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {fmtSize(d.size)} · {d.chars.toLocaleString()} chars extracted · {timeAgo(d.createdAt)}
                </p>
                {d.preview && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{d.preview}…</p>}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={d.audience}
                onChange={(e) => changeAudience(d.id, e.target.value)}
                title="Who can the AI use this for?"
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 outline-none focus:border-brand-500"
              >
                <option value="all">Everyone</option>
                <option value="public">General only</option>
                <option value="student">Students only</option>
              </select>
              <button onClick={() => remove(d.id)} className="text-slate-500 transition hover:text-red-400" title="Delete">✕</button>
            </div>
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
