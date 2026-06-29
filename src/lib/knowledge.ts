import { prisma } from "./prisma";

// Returns knowledge-base text for the AI prompt. When a `query` is given it does
// lightweight keyword retrieval — splitting docs into chunks and keeping the
// most relevant ones — so the right section is included even for large files.
// Without a query it falls back to concatenating from the top.
// `audience` scopes which docs are used: "public"/"student" also include "all".
export async function getKnowledgeContext(
  maxChars = 12000,
  audience?: "public" | "student",
  query?: string
): Promise<string> {
  const faqs = await prisma.faq.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { question: true, answer: true },
  });
  const docs = await prisma.document.findMany({
    where: audience ? { audience: { in: ["all", audience] } } : undefined,
    orderBy: { createdAt: "desc" },
    select: { name: true, text: true },
  });

  // Build chunks. FAQs are one chunk each; docs are split into ~900-char pieces.
  type Chunk = { source: string; text: string };
  const chunks: Chunk[] = [];
  for (const f of faqs) {
    if (f.question?.trim()) chunks.push({ source: "FAQ", text: `Q: ${f.question.trim()}\nA: ${f.answer.trim()}` });
  }
  for (const d of docs) {
    for (const piece of splitText(d.text || "", 900)) {
      chunks.push({ source: d.name, text: piece });
    }
  }
  if (chunks.length === 0) return "";

  const terms = keywords(query);
  let selected: Chunk[];

  if (terms.length) {
    // Score each chunk by how many query terms it contains, then take the best.
    const scored = chunks
      .map((c) => ({ c, score: scoreChunk(c.text, terms) }))
      .sort((a, b) => b.score - a.score);
    // Keep FAQs even at score 0 (short + high-signal); drop irrelevant doc chunks.
    selected = scored.filter((s) => s.score > 0 || s.c.source === "FAQ").map((s) => s.c);
    if (selected.length === 0) selected = chunks; // nothing matched — fall back to everything
  } else {
    selected = chunks;
  }

  // Concatenate up to the budget, grouped by source for readability.
  let out = "";
  for (const c of selected) {
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

function splitText(text: string, size: number): string[] {
  const clean = text.trim();
  if (!clean) return [];
  // Prefer splitting on blank lines, packing paragraphs up to `size`.
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
      q
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP.has(w))
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
