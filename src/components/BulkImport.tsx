"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Row = { name: string; phone?: string; email?: string; company?: string; status?: string };

// Minimal CSV parser (handles quoted fields). Columns: name, phone, email,
// company, status — by header if present, otherwise by position.
function parseCsv(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; }
        else q = !q;
      } else if (c === "," && !q) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const cols = ["name", "phone", "email", "company", "status"];
  const first = splitLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = first.some((h) => cols.includes(h));
  const headerMap = hasHeader ? first : cols;
  const start = hasHeader ? 1 : 0;

  const rows: Row[] = [];
  for (let i = start; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    const row: Record<string, string> = {};
    headerMap.forEach((key, idx) => { if (cols.includes(key)) row[key] = parts[idx] || ""; });
    if ((row.name || "").trim()) rows.push(row as Row);
  }
  return rows;
}

export default function BulkImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = parseCsv(text);

  async function importRows() {
    if (parsed.length === 0) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: parsed }),
    });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setResult(d);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Import failed");
    }
  }

  function onFile(file?: File) {
    if (!file) return;
    file.text().then(setText);
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500";

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5">
        ⬆ Import
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="glass w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Import students</h3>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>
            <p className="text-xs text-slate-400">
              Upload a CSV or paste rows. Columns: <code className="rounded bg-black/30 px-1">name, phone, email, company, status</code> (a header row is optional).
            </p>

            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/5">
              Choose CSV file
            </button>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              placeholder={"name, phone, email, company, status\nJohn Tan, 6591234567, john@x.com, Acme, NEW\nMary Lee, 6598765432, mary@y.com, , CONTACTED"}
              className={`${field} mt-3 resize-none font-mono text-xs`}
            />

            {parsed.length > 0 && <p className="mt-2 text-xs text-slate-400">{parsed.length} valid row(s) detected.</p>}
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            {result && <p className="mt-2 text-sm text-emerald-400">Imported {result.created} student(s){result.skipped ? `, skipped ${result.skipped} (duplicate/invalid)` : ""}.</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Close</button>
              <button onClick={importRows} disabled={busy || parsed.length === 0} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-50">
                {busy ? "Importing…" : `Import ${parsed.length || ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
