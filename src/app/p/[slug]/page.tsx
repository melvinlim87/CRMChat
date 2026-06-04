import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BlockView from "@/components/site/BlockView";
import type { Block } from "@/lib/blocks";

export const dynamic = "force-dynamic";

export default async function PublishedPage({ params }: { params: { slug: string } }) {
  const page = await prisma.page.findUnique({ where: { slug: params.slug } });
  if (!page || !page.published) notFound();

  const blocks = (page.blocks as unknown as Block[]) ?? [];

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl py-10">
        {blocks.map((b) => (
          <BlockView key={b.id} block={b} slug={page.slug} />
        ))}
      </div>
      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-slate-500">
        Powered by ALGO
      </footer>
    </main>
  );
}
