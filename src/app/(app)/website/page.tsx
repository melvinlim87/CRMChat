import { prisma } from "@/lib/prisma";
import WebsiteList from "@/components/site/WebsiteList";

export const dynamic = "force-dynamic";

export default async function WebsitePage() {
  const pages = await prisma.page.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-white/10 bg-surface-panel px-8 py-5">
        <h1 className="text-xl font-semibold text-slate-100">Website</h1>
        <p className="text-sm text-slate-400">Build landing pages with drag-and-drop widgets, then publish them live.</p>
      </header>
      <div className="flex-1 overflow-auto p-8">
        <WebsiteList
          initial={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug, published: p.published }))}
        />
      </div>
    </div>
  );
}
