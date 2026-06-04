"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { type Block, type BlockType, WIDGETS, newBlock, alignClass, flexAlign } from "@/lib/blocks";

type PageDTO = { id: string; title: string; slug: string; published: boolean; blocks: Block[] };

export default function SiteBuilder({ page }: { page: PageDTO }) {
  const [blocks, setBlocks] = useState<Block[]>(page.blocks?.length ? page.blocks : []);
  const [title, setTitle] = useState(page.title);
  const [published, setPublished] = useState(page.published);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const selected = blocks.find((b) => b.id === selectedId) || null;

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
                <EditableBlock block={b} onChange={(patch) => updateData(b.id, patch)} />
              </div>
            ))}
          </div>
        </div>

        {/* Settings panel */}
        <aside className="w-64 shrink-0 border-l border-white/10 bg-surface-panel p-4">
          {selected ? (
            <Settings block={selected} onChange={(patch) => updateData(selected.id, patch)} onDelete={() => removeBlock(selected.id)} />
          ) : (
            <p className="text-sm text-slate-500">Select a block to edit its settings.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ----------------------------- Editable block ----------------------------- */

function EditableBlock({ block, onChange }: { block: Block; onChange: (patch: Record<string, unknown>) => void }) {
  const d = block.data || {};
  switch (block.type) {
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
      return <Editable value={d.text} onCommit={(v) => onChange({ text: v })} className={`px-6 py-3 font-display text-3xl font-semibold text-slate-100 ${alignClass(d.align)}`} />;
    case "text":
      return <Editable value={d.text} onCommit={(v) => onChange({ text: v })} className={`px-6 py-2 text-base leading-relaxed text-slate-300 ${alignClass(d.align)}`} />;
    case "button":
      return (
        <div className={`flex px-6 py-3 ${flexAlign(d.align)}`}>
          <span className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-slate-950">
            <Editable inline value={d.label} onCommit={(v) => onChange({ label: v })} />
          </span>
        </div>
      );
    case "image":
      return (
        <div className={`flex px-6 py-3 ${flexAlign(d.align)}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.src} alt={d.alt || ""} className="max-w-full rounded-xl border border-white/10" />
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
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  inline?: boolean;
}) {
  const Tag = inline ? "span" : "div";
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
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

/* ------------------------------- Settings -------------------------------- */

function Settings({
  block,
  onChange,
  onDelete,
}: {
  block: Block;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
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

      {(block.type === "button" || block.type === "hero") && (
        <Field label="Button link">
          <input className={field} value={block.type === "hero" ? d.buttonHref ?? "" : d.href ?? ""} onChange={(e) => onChange(block.type === "hero" ? { buttonHref: e.target.value } : { href: e.target.value })} placeholder="https://…" />
        </Field>
      )}

      {block.type === "image" && (
        <>
          <Field label="Image URL"><input className={field} value={d.src ?? ""} onChange={(e) => onChange({ src: e.target.value })} /></Field>
          <Field label="Alt text"><input className={field} value={d.alt ?? ""} onChange={(e) => onChange({ alt: e.target.value })} /></Field>
        </>
      )}

      {block.type === "spacer" && (
        <Field label="Height (px)"><input type="number" className={field} value={d.size ?? 32} onChange={(e) => onChange({ size: Number(e.target.value) })} /></Field>
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
