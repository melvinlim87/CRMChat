import { prisma } from "./prisma";
import { embed, embeddingsAvailable, cosineSim } from "./ai";

type Chunk = { source: string; text: string };

// Returns knowledge-base text for the AI prompt. With a `query` it retrieves the
// most relevant chunks — semantic (vector) search when an embeddings provider is
// configured, otherwise keyword matching. FAQs are always included.
export async function getKnowledgeContext(
  maxChars = 12000,
  audience?: "public" | "student",
  query?: string
): Promise<string> {
  const docWhere = audience ? { audience: { in: ["all", audience] } } : undefined;

  // FAQs — short and high-signal, always included.
  const faqs = await prisma.faq.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { question: true, answer: true },
  });
  const faqChunks: Chunk[] = faqs
    .filter((f) => f.question?.trim())
    .map((f) => ({ source: "FAQ", text: `Q: ${f.question.trim()}\nA: ${f.answer.trim()}` }));

  let docChunks: Chunk[] = [];

  // 1) Semantic search over indexed chunks.
  if (query && (await embeddingsAvailable())) {
    const qv = (await embed([query]))?.[0];
    if (qv) {
      const rows = await prisma.documentChunk.findMany({
        where: audience ? { document: { audience: { in: ["all", audience] } } } : undefined,
        select: { text: true, embedding: true, document: { select: { name: true } } },
      });
      if (rows.length) {
        docChunks = rows
          .map((r) => ({ source: r.document.name, text: r.text, score: cosineSim(qv, r.embedding as number[]) }))
          .sort((a, b) => b.score - a.score)
          .map(({ source, text }) => ({ source, text }));
      }
    }
  }

  // 2) Keyword fallback over raw document text (no embeddings / not indexed).
  if (docChunks.length === 0) {
    const docs = await prisma.document.findMany({
      where: docWhere,
      orderBy: { createdAt: "desc" },
      select: { name: true, text: true },
    });
    const raw: Chunk[] = [];
    for (const d of docs) for (const p of splitText(d.text || "", 900)) raw.push({ source: d.name, text: p });
    const terms = keywords(query);
    if (terms.length) {
      const scored = raw.map((c) => ({ c, score: scoreChunk(c.text, terms) })).sort((a, b) => b.score - a.score);
      docChunks = scored.filter((s) => s.score > 0).map((s) => s.c);
      if (docChunks.length === 0) docChunks = raw;
    } else {
      docChunks = raw;
    }
  }

  // Assemble FAQs first, then the best doc chunks, up to the budget.
  let out = "";
  for (const c of [...faqChunks, ...docChunks]) {
    const block = `\n\n# ${c.source}\n${c.text.trim()}`;
    if (out.length + block.length > maxChars) {
      const remaining = maxChars - out.length;
      if (remaining > 200) out += block.slice(0, remaining);
      break;
    }
    out += block;
  }
  return out.trim();
}

// Build + store embedding chunks for a document. Returns the number indexed
// (0 if no embeddings provider is configured — keyword search still works).
export async function indexDocument(documentId: string, text: string): Promise<number> {
  await prisma.documentChunk.deleteMany({ where: { documentId } });
  const pieces = splitText(text || "", 900);
  if (pieces.length === 0) return 0;
  const vectors = await embed(pieces);
  if (!vectors || vectors.length !== pieces.length) return 0;
  await prisma.documentChunk.createMany({
    data: pieces.map((t, i) => ({ documentId, text: t, embedding: vectors[i] as object })),
  });
  return pieces.length;
}

export async function reindexAll(): Promise<{ docs: number; chunks: number }> {
  const docs = await prisma.document.findMany({ select: { id: true, text: true } });
  let chunks = 0;
  for (const d of docs) chunks += await indexDocument(d.id, d.text || "");
  return { docs: docs.length, chunks };
}

export function splitText(text: string, size: number): string[] {
  const clean = text.trim();
  if (!clean) return [];
  const paras = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    if (p.length > size) {
      if (buf) { out.push(buf); buf = ""; }
      for (let i = 0; i < p.length; i += size) out.push(p.slice(i, i + size));
      continue;
    }
    if ((buf + "\n\n" + p).length > size) { out.push(buf); buf = p; }
    else buf = buf ? `${buf}\n\n${p}` : p;
  }
  if (buf) out.push(buf);
  return out;
}

const STOP = new Set(["the", "a", "an", "of", "to", "is", "are", "and", "or", "what", "who", "how", "do", "does", "you", "your", "i", "me", "my", "can", "for", "in", "on", "with", "about", "this", "that", "it", "be", "have", "has"]);

function keywords(q?: string): string[] {
  if (!q) return [];
  return Array.from(
    new Set(
      q.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
    )
  );
}

function scoreChunk(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const t of terms) {
    const matches = lower.split(t).length - 1;
    if (matches > 0) score += 1 + Math.min(matches - 1, 3) * 0.25;
  }
  return score;
}
