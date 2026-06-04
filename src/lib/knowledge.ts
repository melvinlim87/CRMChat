import { prisma } from "./prisma";

// Returns concatenated knowledge-base text, capped so it fits in a prompt.
// Simple "context stuffing" RAG — good for a modest number of documents.
export async function getKnowledgeContext(maxChars = 6000): Promise<string> {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    select: { name: true, text: true },
  });
  if (docs.length === 0) return "";

  let out = "";
  for (const d of docs) {
    if (!d.text?.trim()) continue;
    const chunk = `\n\n# ${d.name}\n${d.text.trim()}`;
    if (out.length + chunk.length > maxChars) {
      out += chunk.slice(0, Math.max(0, maxChars - out.length));
      break;
    }
    out += chunk;
  }
  return out.trim();
}
