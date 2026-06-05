"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { type Block, type BlockType, WIDGETS, COLUMN_WIDGETS, FONT_OPTIONS, newBlock, alignClass, flexAlign, embedUrl, textStyle, spacingStyle } from "@/lib/blocks";

type PageDTO = { id: string; title: string; slug: string; published: boolean; blocks: Block[] };

type ChildOps = {
  add: (colIndex: number, type: BlockType) => void;
  update: (childId: string, patch: Record<string, unknown>) => void;
  remove: (childId: string) => void;
  move: (childId: string, dir: "up" | "down" | "left" | "right") => void;
  setCount: (count: number) => void;
};

type SectionOps = {
  add: (type: BlockType) => void;
  update: (childId: string, patch: Record<string, unknown>) => void;
  remove: (childId: string) => void;
  move: (childId: string, dir: "up" | "down") => void;
};

export default function SiteBuilder({ page }: { page: PageDTO }) {
  const [blocks, setBlocks] = useState<Block[]>(page.blocks?.length ? page.blocks : []);
  const [title, setTitle] = useState(page.title);
  const [published, setPublished] = useState(page.published);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragIndex = useRef<number | null>(null);

  // Resolve the selected block whether it's top-level or nested in a column,
  // returning the right change/delete handlers for it.
  function resolveSelected(): { block: Block; onChange: (p: Record<string, unknown>) => void; onDelete: () => void } | null {
    if (!selectedId) return null;
    const top = blocks.find((b) => b.id === selectedId);
    if (top) return { block: top, onChange: (p) => updateData(top.id, p), onDelete: () => removeBlock(top.id) };
    for (const b of blocks) {
      if (b.type === "columns") {
        const cols = (b.data.columns as Block[][]) ?? [];
        for (const col of cols) {
          const child = col.find((ch) => ch.id === selectedId);
          if (child) {
            const ops = makeChildOps(b.id);
            return { block: child, onChange: (p) => ops.update(child.id, p), onDelete: () => ops.remove(child.id) };
          }
        }
      } else if (b.type === "section") {
        const child = ((b.data.children as Block[]) ?? []).find((ch) => ch.id === selectedId);
        if (child) {
          const ops = makeSectionOps(b.id);
          return { block: child, onChange: (p) => ops.update(child.id, p), onDelete: () => ops.remove(child.id) };
        }
      }
    }
    return null;
  }
  const selected = resolveSelected();
  const sections = blocks.filter((b) => b.type === "section").map((b) => ({ id: b.id, name: (b.data.name as string) || "Section" }));

  function addBlock(type: BlockType) {
    const b = newBlock(type);
    setBlocks((prev) => [...prev, b]);
    setSelectedId(b.id);
  }
  function updateData(id: string, patch: Record<string, unknown>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...patch } } : b)));
  }
  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }
  function reorderTo(index: number) {
    const from = dragIndex.current;
    if (from === null || from === index) return;
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndex.current = index;
  }

  // --- Column child operations (nested blocks inside a "columns" block) ---
  function mutateColumns(colId: string, fn: (cols: Block[][]) => Block[][], extra?: Record<string, unknown>) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === colId ? { ...b, data: { ...b.data, columns: fn((b.data.columns as Block[][]) ?? []), ...(extra ?? {}) } } : b
      )
    );
  }
  function mutateSection(secId: string, fn: (children: Block[]) => Block[]) {
    setBlocks((prev) => prev.map((b) => (b.id === secId ? { ...b, data: { ...b.data, children: fn((b.data.children as Block[]) ?? []) } } : b)));
  }
  function makeSectionOps(secId: string): SectionOps {
    return {
      add: (type) => mutateSection(secId, (ch) => [...ch, newBlock(type)]),
      update: (childId, patch) => mutateSection(secId, (ch) => ch.map((c) => (c.id === childId ? { ...c, data: { ...c.data, ...patch } } : c))),
      remove: (childId) => mutateSection(secId, (ch) => ch.filter((c) => c.id !== childId)),
      move: (childId, dir) =>
        mutateSection(secId, (ch) => {
          const idx = ch.findIndex((c) => c.id === childId);
          if (idx < 0) return ch;
          const next = [...ch];
          const [item] = next.splice(idx, 1);
          next.splice(dir === "up" ? Math.max(0, idx - 1) : idx + 1, 0, item);
          return next;
        }),
    };
  }
  function makeChildOps(colId: string): ChildOps {
    return {
      add: (ci, type) => mutateColumns(colId, (cols) => cols.map((c, i) => (i === ci ? [...c, newBlock(type)] : c))),
      update: (childId, patch) =>
        mutateColumns(colId, (cols) => cols.map((c) => c.map((ch) => (ch.id === childId ? { ...ch, data: { ...ch.data, ...patch } } : ch)))),
      remove: (childId) => mutateColumns(colId, (cols) => cols.map((c) => c.filter((ch) => ch.id !== childId))),
      move: (childId, dir) =>
        mutateColumns(colId, (cols) => {
          let ci = -1, idx = -1;
          cols.forEach((c, i) => { const j = c.findIndex((ch) => ch.id === childId); if (j >= 0) { ci = i; idx = j; } });
          if (ci < 0) return cols;
          const next = cols.map((c) => [...c]);
          const [item] = next[ci].splice(idx, 1);
          if (dir === "up") next[ci].splice(Math.max(0, idx - 1), 0, item);
          else if (dir === "down") next[ci].splice(idx + 1, 0, item);
          else if (dir === "left" && ci > 0) next[ci - 1].push(item);
          else if (dir === "right" && ci < next.length - 1) next[ci + 1].push(item);
          else next[ci].splice(idx, 0, item);
          return next;
        }),
      setCount: (count) =>
        mutateColumns(
          colId,
          (cols) => {
            const next = cols.map((c) => [...c]);
            if (count > next.length) while (next.length < count) next.push([]);
            else if (count < next.length) {
              const extra = next.slice(count).flat();
              const kept = next.slice(0, count);
              kept[count - 1] = [...kept[count - 1], ...extra];
              return kept;
            }
            return next;
          },
          { count }
        ),
    };
  }

  async function save(nextPublished = published) {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/pages/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, published: nextPublished, blocks }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  }
  async function togglePublish() {
    const next = !published;
    setPublished(next);
    await save(next);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-surface-panel px-6 py-3">
        <Link href="/website" className="text-sm text-slate-500 hover:text-slate-200">← Pages</Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-100 outline-none focus:border-brand-500"
        />
        <span className="text-xs text-slate-500">/p/{page.slug}</span>
        <div className="ml-auto flex items-center gap-2">
          {published && (
            <a href={`/p/${page.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5">
              View live ↗
            </a>
          )}
          {saved && <span className="text-sm text-emerald-400">Saved ✓</span>}
          <button onClick={() => save()} disabled={saving} className="rounded-lg border border-white/10 px-4 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/5 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={togglePublish} className={clsx("rounded-lg px-4 py-1.5 text-sm font-semibold", published ? "bg-emerald-500 text-slate-950" : "bg-gold text-slate-950")}>
            {published ? "Published" : "Publish"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Widget palette */}
        <aside className="w-44 shrink-0 space-y-1.5 border-r border-white/10 bg-surface-panel p-3">
          <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Widgets</p>
          {WIDGETS.map((w) => (
            <button
              key={w.type}
              onClick={() => addBlock(w.type)}
              className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-slate-300 transition hover:border-brand-500/50 hover:bg-white/5"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-xs text-brand-300">{w.icon}</span>
              {w.label}
            </button>
          ))}
        </aside>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-surface-panel/60">
            {blocks.length === 0 && (
              <p className="px-6 py-24 text-center text-slate-500">
                Click a widget on the left to start building your page.
              </p>
            )}
            {blocks.map((b, i) => (
              <div
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  reorderTo(i);
                }}
                className={clsx(
                  "group relative border-b border-dashed border-white/5",
                  selectedId === b.id && "ring-2 ring-inset ring-brand-500/60"
                )}
              >
                {/* drag handle */}
                <button
                  draggable
                  onDragStart={() => (dragIndex.current = i)}
                  onDragEnd={() => (dragIndex.current = null)}
                  title="Drag to reorder"
                  className="absolute left-1 top-1 z-10 cursor-grab rounded bg-black/40 px-1.5 text-slate-400 opacity-0 transition group-hover:opacity-100"
                >
                  ⠿
                </button>
                <EditableBlock block={b} onChange={(patch) => updateData(b.id, patch)} childOps={b.type === "columns" ? makeChildOps(b.id) : undefined} sectionOps={b.type === "section" ? makeSectionOps(b.id) : undefined} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            ))}
          </div>
        </div>

        {/* Settings panel */}
        <aside className="w-64 shrink-0 border-l border-white/10 bg-surface-panel p-4">
          {selected ? (
            <Settings block={selected.block} onChange={selected.onChange} onDelete={selected.onDelete} sections={sections} />
          ) : (
            <p className="text-sm text-slate-500">Select a block to edit its settings.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ----------------------------- Editable block ----------------------------- */

function EditableBlock({
  block,
  onChange,
  childOps,
  sectionOps,
  selectedId,
  onSelect,
}: {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  childOps?: ChildOps;
  sectionOps?: SectionOps;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const d = block.data || {};
  switch (block.type) {
    case "section": {
      const children = (d.children as Block[]) ?? [];
      return (
        <section className="px-6" style={{ background: d.bg || undefined, ...spacingStyle(d) }}>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">▦ {d.name || "Section"}</div>
          <div className="mx-auto max-w-3xl">
            {children.map((child) => (
              <div
                key={child.id}
                onClick={(e) => { e.stopPropagation(); onSelect?.(child.id); }}
                className={clsx("group/s relative rounded hover:bg-white/5", selectedId === child.id && "ring-2 ring-inset ring-brand-500/60")}
              >
                <div className="absolute right-1 top-1 z-10 flex gap-0.5 rounded bg-black/50 p-0.5 opacity-0 transition group-hover/s:opacity-100">
                  <Tbtn title="Up" onClick={() => sectionOps?.move(child.id, "up")}>▲</Tbtn>
                  <Tbtn title="Down" onClick={() => sectionOps?.move(child.id, "down")}>▼</Tbtn>
                  <Tbtn title="Delete" onClick={() => sectionOps?.remove(child.id)}>✕</Tbtn>
                </div>
                <EditableBlock block={child} onChange={(patch) => sectionOps?.update(child.id, patch)} childOps={child.type === "columns" ? undefined : undefined} selectedId={selectedId} onSelect={onSelect} />
              </div>
            ))}
            <select
              value=""
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { if (e.target.value) sectionOps?.add(e.target.value as BlockType); e.currentTarget.value = ""; }}
              className="nodrag mt-2 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-400 outline-none"
            >
              <option value="">+ Add element to section…</option>
              {COLUMN_WIDGETS.map((w) => <option key={w.type} value={w.type}>{w.label}</option>)}
            </select>
          </div>
        </section>
      );
    }
    case "video": {
      const src = embedUrl(d.url);
      return (
        <div className="px-6 py-4">
          {src ? (
            <div className="mx-auto aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-white/10" style={spacingStyle(d)}>
              <iframe src={src} className="h-full w-full" title="Video" allowFullScreen />
            </div>
          ) : (
            <div className="mx-auto flex aspect-video max-w-2xl items-center justify-center rounded-xl border border-dashed border-white/15 text-sm text-slate-500">
              ▶ Add a video URL in settings →
            </div>
          )}
        </div>
      );
    }
    case "columns": {
      const cols: Block[][] = Array.isArray(d.columns) ? d.columns : [];
      const count = Number(d.count) || cols.length || 2;
      return (
        <div className="px-4 py-4" style={spacingStyle(d)}>
          <div className={`grid ${count === 3 ? "grid-cols-3" : "grid-cols-2"}`} style={{ gap: `${d.gap ?? 12}px` }}>
            {cols.map((col, ci) => (
              <div key={ci} className="rounded-lg border border-dashed border-white/10 p-1.5">
                {col.map((child) => (
                  <div
                    key={child.id}
                    onClick={(e) => { e.stopPropagation(); onSelect?.(child.id); }}
                    className={clsx(
                      "group/c relative rounded hover:bg-white/5",
                      selectedId === child.id && "ring-2 ring-inset ring-brand-500/60"
                    )}
                  >
                    <div className="absolute right-1 top-1 z-10 flex gap-0.5 rounded bg-black/50 p-0.5 opacity-0 transition group-hover/c:opacity-100">
                      <Tbtn title="Move left" onClick={() => childOps?.move(child.id, "left")}>◀</Tbtn>
                      <Tbtn title="Up" onClick={() => childOps?.move(child.id, "up")}>▲</Tbtn>
                      <Tbtn title="Down" onClick={() => childOps?.move(child.id, "down")}>▼</Tbtn>
                      <Tbtn title="Move right" onClick={() => childOps?.move(child.id, "right")}>▶</Tbtn>
                      <Tbtn title="Delete" onClick={() => childOps?.remove(child.id)}>✕</Tbtn>
                    </div>
                    <EditableBlock block={child} onChange={(patch) => childOps?.update(child.id, patch)} />
                  </div>
                ))}
                <select
                  value=""
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { if (e.target.value) childOps?.add(ci, e.target.value as BlockType); e.currentTarget.value = ""; }}
                  className="nodrag mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400 outline-none"
                >
                  <option value="">+ Add element…</option>
                  {COLUMN_WIDGETS.map((w) => <option key={w.type} value={w.type}>{w.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "hero":
      return (
        <section className={`px-6 py-16 ${alignClass(d.align)}`}>
          <Editable value={d.title} onCommit={(v) => onChange({ title: v })} className="font-display text-4xl font-semibold text-gold" />
          <Editable value={d.subtitle} onCommit={(v) => onChange({ subtitle: v })} className="mx-auto mt-3 max-w-xl text-lg text-slate-400" />
          <div className={`mt-6 flex ${flexAlign(d.align)}`}>
            <span className="rounded-full bg-gold px-7 py-3 text-sm font-semibold text-slate-950">
              <Editable inline value={d.buttonLabel} onCommit={(v) => onChange({ buttonLabel: v })} />
            </span>
          </div>
        </section>
      );
    case "heading":
      return <Editable value={d.text} onCommit={(v) => onChange({ text: v })} className={`px-6 py-3 font-display text-3xl font-semibold text-slate-100 ${alignClass(d.align)}`} style={{ ...textStyle(d), ...spacingStyle(d) }} />;
    case "text":
      return <Editable value={d.text} onCommit={(v) => onChange({ text: v })} className={`px-6 py-2 text-base leading-relaxed text-slate-300 ${alignClass(d.align)}`} style={{ ...textStyle(d), ...spacingStyle(d) }} />;
    case "button":
      return (
        <div className={`flex px-6 py-3 ${flexAlign(d.align)}`} style={spacingStyle(d)}>
          <span className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-slate-950">
            <Editable inline value={d.label} onCommit={(v) => onChange({ label: v })} />
          </span>
        </div>
      );
    case "image":
      return <ImageBlockEditor d={d} onChange={onChange} />;
    case "form":
      return (
        <div className="px-6 py-8">
          <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
            <Editable value={d.heading} onCommit={(v) => onChange({ heading: v })} className="font-display text-2xl font-semibold text-slate-100" />
            <Editable value={d.subtext} onCommit={(v) => onChange({ subtext: v })} className="mt-1 text-sm text-slate-400" />
            <div className="mt-4 space-y-2 opacity-70">
              <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-500">Your name</div>
              <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-500">Email</div>
              <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-500">Phone (optional)</div>
              <span className="inline-block rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-slate-950">
                <Editable inline value={d.buttonLabel} onCommit={(v) => onChange({ buttonLabel: v })} />
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Submissions create a lead in your CRM inbox.</p>
          </div>
        </div>
      );
    case "divider":
      return <div className="px-6 py-3"><hr className="border-white/10" /></div>;
    case "spacer":
      return <div className="flex items-center justify-center text-xs text-slate-600" style={{ height: Number(d.size) || 32 }}>spacer</div>;
    default:
      return null;
  }
}

function Editable({
  value,
  onCommit,
  className,
  inline,
  style,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  inline?: boolean;
  style?: React.CSSProperties;
}) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      style={style}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => onCommit((e.currentTarget.textContent || "").trim())}
      className={clsx(className, "cursor-text rounded outline-none focus:ring-1 focus:ring-brand-500/60")}
      dangerouslySetInnerHTML={{ __html: escapeHtml(value ?? "") }}
    />
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ImageBlockEditor({ d, onChange }: { d: Record<string, any>; onChange: (patch: Record<string, unknown>) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(d.src || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const { url: u } = await res.json();
      setUrl(u);
      onChange({ src: u });
      setOpen(false);
    } else {
      const e = await res.json().catch(() => ({}));
      setError(e.error || "Upload failed");
    }
  }

  return (
    <div className={`group/img relative flex px-6 py-3 ${flexAlign(d.align)}`} style={spacingStyle(d)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={d.src} alt={d.alt || ""} className="max-w-full rounded-xl border border-white/10" />
      <button
        onClick={(e) => { e.stopPropagation(); setUrl(d.src || ""); setOpen(true); }}
        className="absolute right-8 top-5 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition group-hover/img:opacity-100"
      >
        ✎ Edit image
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="glass w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Image</h3>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "⬆ Upload from computer"}
            </button>
            <div className="my-3 flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-white/10" /> or paste a URL <span className="h-px flex-1 bg-white/10" />
            </div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…/image.jpg"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
            />
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <button onClick={() => { onChange({ src: url.trim() }); setOpen(false); }} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-600">
                Use image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tbtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button title={title} onClick={(e) => { e.stopPropagation(); onClick(); }} className="rounded px-1 text-[10px] text-slate-300 hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}

/* ------------------------------- Settings -------------------------------- */

function Settings({
  block,
  onChange,
  onDelete,
  sections,
}: {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  sections?: { id: string; name: string }[];
}) {
  const d = block.data || {};
  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-brand-500";
  const hasAlign = ["hero", "heading", "text", "button", "image"].includes(block.type);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold capitalize text-slate-100">{block.type}</p>
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300">Delete</button>
      </div>

      {hasAlign && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Alignment</label>
          <div className="grid grid-cols-3 gap-1">
            {["left", "center", "right"].map((a) => (
              <button
                key={a}
                onClick={() => onChange({ align: a })}
                className={clsx("rounded-md border px-2 py-1 text-xs capitalize", d.align === a ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-white/10 text-slate-400 hover:bg-white/5")}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {block.type === "section" && (
        <>
          <Field label="Section name (used for jump links)">
            <input className={field} value={d.name ?? ""} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Pricing" />
          </Field>
          <Field label="Background color">
            <div className="flex items-center gap-2">
              <input type="color" value={d.bg || "#0c0d11"} onChange={(e) => onChange({ bg: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-white/10 bg-transparent" />
              <input className={field} value={d.bg ?? ""} onChange={(e) => onChange({ bg: e.target.value })} placeholder="transparent" />
              <button onClick={() => onChange({ bg: "" })} className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400 hover:bg-white/5">clear</button>
            </div>
          </Field>
        </>
      )}

      {(block.type === "button" || block.type === "hero") && (
        <Field label="Button link">
          <input className={field} value={block.type === "hero" ? d.buttonHref ?? "" : d.href ?? ""} onChange={(e) => onChange(block.type === "hero" ? { buttonHref: e.target.value } : { href: e.target.value })} placeholder="https://…" />
        </Field>
      )}

      {block.type === "button" && sections && sections.length > 0 && (
        <Field label="…or jump to a section">
          <select className={field} value="" onChange={(e) => { if (e.target.value) onChange({ href: e.target.value }); }}>
            <option value="">Choose a section…</option>
            {sections.map((s) => <option key={s.id} value={`#sec-${s.id}`}>{s.name}</option>)}
          </select>
        </Field>
      )}

      {block.type === "image" && (
        <>
          <Field label="Image URL"><input className={field} value={d.src ?? ""} onChange={(e) => onChange({ src: e.target.value })} /></Field>
          <Field label="Alt text"><input className={field} value={d.alt ?? ""} onChange={(e) => onChange({ alt: e.target.value })} /></Field>
        </>
      )}

      {block.type === "video" && (
        <Field label="Video URL (YouTube/Vimeo)">
          <input className={field} value={d.url ?? ""} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://youtube.com/watch?v=…" />
        </Field>
      )}

      {block.type === "columns" && (
        <Field label="Number of columns">
          <div className="grid grid-cols-2 gap-1">
            {[2, 3].map((n) => (
              <button
                key={n}
                onClick={() => {
                  const cols = ((d.columns as Block[][]) ?? []).map((c) => [...c]);
                  let next = cols;
                  if (n > next.length) { while (next.length < n) next.push([]); }
                  else if (n < next.length) { const extra = next.slice(n).flat(); next = next.slice(0, n); next[n - 1] = [...next[n - 1], ...extra]; }
                  onChange({ count: n, columns: next });
                }}
                className={clsx("rounded-md border px-2 py-1 text-xs", (Number(d.count) || 2) === n ? "border-brand-500 bg-brand-500/15 text-brand-300" : "border-white/10 text-slate-400 hover:bg-white/5")}
              >
                {n} columns
              </button>
            ))}
          </div>
        </Field>
      )}

      {block.type === "spacer" && (
        <Field label="Height (px)"><input type="number" className={field} value={d.size ?? 32} onChange={(e) => onChange({ size: Number(e.target.value) })} /></Field>
      )}

      {block.type === "form" && (
        <Field label="Success message">
          <textarea className={field} rows={3} value={d.successMessage ?? ""} onChange={(e) => onChange({ successMessage: e.target.value })} />
        </Field>
      )}

      {["heading", "text"].includes(block.type) && (
        <>
          <Field label="Font size (px)">
            <input type="number" className={field} value={d.fontSize ?? ""} onChange={(e) => onChange({ fontSize: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="default" />
          </Field>
          <Field label="Font">
            <select className={field} value={d.fontFamily ?? "sans"} onChange={(e) => onChange({ fontFamily: e.target.value })}>
              {FONT_OPTIONS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </Field>
        </>
      )}

      {block.type === "columns" && (
        <Field label="Gap between columns (px)">
          <input type="number" className={field} value={d.gap ?? 12} onChange={(e) => onChange({ gap: Number(e.target.value) })} />
        </Field>
      )}

      {!["divider", "spacer"].includes(block.type) && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Spacing — padding (px)</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" className={field} value={d.padTop ?? ""} onChange={(e) => onChange({ padTop: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Top" />
            <input type="number" className={field} value={d.padBottom ?? ""} onChange={(e) => onChange({ padBottom: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Bottom" />
          </div>
        </div>
      )}

      <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-500">
        Tip: click any text on the canvas to edit it directly.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}
