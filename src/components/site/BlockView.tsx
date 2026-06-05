import { type Block, alignClass, flexAlign, embedUrl } from "@/lib/blocks";
import PublicForm from "./PublicForm";

// Read-only render of a single block — used by the public published page.
export default function BlockView({ block, slug }: { block: Block; slug: string }) {
  const d = block.data || {};
  switch (block.type) {
    case "form":
      return <PublicForm slug={slug} data={d} />;
    case "columns": {
      const cols: Block[][] = Array.isArray(d.columns) ? d.columns : [];
      const count = Number(d.count) || cols.length || 2;
      return (
        <div className="px-6 py-4">
          <div className={`grid gap-6 ${count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {cols.map((col, i) => (
              <div key={i}>
                {col.map((child) => (
                  <BlockView key={child.id} block={child} slug={slug} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "video": {
      const src = embedUrl(d.url);
      if (!src) return null;
      return (
        <div className="px-6 py-4">
          <div className="mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-white/10">
            <iframe src={src} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video" />
          </div>
        </div>
      );
    }
    case "hero":
      return (
        <section className={`px-6 py-20 ${alignClass(d.align)}`}>
          <div className="mx-auto max-w-3xl">
            <h1 className="font-display text-4xl font-semibold leading-tight text-slate-100 sm:text-5xl">
              <span className="text-gold">{d.title}</span>
            </h1>
            {d.subtitle && <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">{d.subtitle}</p>}
            {d.buttonLabel && (
              <div className={`mt-8 flex ${flexAlign(d.align)}`}>
                <a href={d.buttonHref || "#"} className="rounded-full bg-gold px-7 py-3 text-sm font-semibold text-slate-950 shadow-glow">
                  {d.buttonLabel}
                </a>
              </div>
            )}
          </div>
        </section>
      );
    case "heading":
      return (
        <h2 className={`px-6 py-3 font-display text-3xl font-semibold text-slate-100 ${alignClass(d.align)}`}>
          {d.text}
        </h2>
      );
    case "text":
      return <p className={`px-6 py-2 text-base leading-relaxed text-slate-300 ${alignClass(d.align)}`}>{d.text}</p>;
    case "button":
      return (
        <div className={`flex px-6 py-3 ${flexAlign(d.align)}`}>
          <a href={d.href || "#"} className="rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-slate-950">
            {d.label}
          </a>
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
      return (
        <div className="px-6 py-3">
          <hr className="border-white/10" />
        </div>
      );
    case "spacer":
      return <div style={{ height: Number(d.size) || 32 }} />;
    default:
      return null;
  }
}
