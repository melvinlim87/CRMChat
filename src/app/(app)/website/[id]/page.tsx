import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SiteBuilder from "@/components/site/SiteBuilder";
import type { Block } from "@/lib/blocks";

export const dynamic = "force-dynamic";

export default async function SiteBuilderPage({ params }: { params: { id: string } }) {
  const page = await prisma.page.findUnique({ where: { id: params.id } });
  if (!page) notFound();

  return (
    <SiteBuilder
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        published: page.published,
        blocks: (page.blocks as unknown as Block[]) ?? [],
      }}
    />
  );
}
