import { prisma } from "./prisma";

// Returns concatenated knowledge-base text, capped so it fits in a prompt.
// Simple "context stuffing" RAG — good for a modest number of documents.
export async function getKnowledgeContext(maxChars = 6000): Promise<string> {
  let out = "";

  // FAQs first — they're short, high-signal answers the assistant should know.
  const faqs = await prisma.faq.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { question: true, answer: true },
  });
  if (faqs.length) {
    const faqText = faqs.map((f) => `Q: ${f.question.trim()}\nA: ${f.answer.trim()}`).join("\n\n");
    out += `\n\n# Frequently Asked Questions\n${faqText}`;
  }

  const docs = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    select: { name: true, text: true },
  });

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
