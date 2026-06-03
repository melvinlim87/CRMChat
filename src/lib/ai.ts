// Multi-provider AI layer. Settings (provider, model, API keys) are stored in
// the Setting table under key "ai". Calls go directly to each provider's REST
// API so we don't need provider SDKs.
import { prisma } from "./prisma";

export type AIProvider = "anthropic" | "openai" | "google";

export type ModelOption = { id: string; label: string };

// Selectable models per provider. Users can switch freely in Settings.
export const MODEL_CATALOG: Record<AIProvider, { label: string; models: ModelOption[] }> = {
  anthropic: {
    label: "Anthropic (Claude)",
    models: [
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-opus-latest", label: "Claude 3 Opus" },
    ],
  },
  openai: {
    label: "OpenAI (GPT)",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
  },
  google: {
    label: "Google (Gemini)",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
};

export type AIConfig = {
  provider: AIProvider;
  model: string;
  keys: Partial<Record<AIProvider, string>>;
};

const DEFAULT_CONFIG: AIConfig = {
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  keys: {},
};

export async function getAIConfig(): Promise<AIConfig> {
  const row = await prisma.setting.findUnique({ where: { key: "ai" } });
  if (!row) return DEFAULT_CONFIG;
  const v = row.value as Partial<AIConfig>;
  return {
    provider: v.provider ?? DEFAULT_CONFIG.provider,
    model: v.model ?? DEFAULT_CONFIG.model,
    keys: v.keys ?? {},
  };
}

// Settings safe to send to the browser (keys are never exposed, only flags).
export async function getAIPublicSettings() {
  const cfg = await getAIConfig();
  return {
    provider: cfg.provider,
    model: cfg.model,
    keysSet: {
      anthropic: Boolean(cfg.keys.anthropic),
      openai: Boolean(cfg.keys.openai),
      google: Boolean(cfg.keys.google),
    },
  };
}

export async function saveAIConfig(input: {
  provider?: AIProvider;
  model?: string;
  keys?: Partial<Record<AIProvider, string>>;
}): Promise<void> {
  const current = await getAIConfig();
  const keys = { ...current.keys };
  // Only overwrite a key when a non-empty value is provided.
  for (const p of ["anthropic", "openai", "google"] as AIProvider[]) {
    const incoming = input.keys?.[p];
    if (typeof incoming === "string" && incoming.trim()) keys[p] = incoming.trim();
  }
  const next: AIConfig = {
    provider: input.provider ?? current.provider,
    model: input.model ?? current.model,
    keys,
  };
  await prisma.setting.upsert({
    where: { key: "ai" },
    update: { value: next as object },
    create: { key: "ai", value: next as object },
  });
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AIResult = { text: string | null; error?: string };

export async function generateReply(
  messages: ChatMessage[],
  system: string,
  override?: { provider?: AIProvider; model?: string }
): Promise<AIResult> {
  const cfg = await getAIConfig();
  const provider = override?.provider ?? cfg.provider;
  const model = override?.model ?? cfg.model;
  const key = cfg.keys[provider];

  if (!key) {
    return { text: null, error: `No API key set for ${MODEL_CATALOG[provider].label}. Add one in Settings.` };
  }

  try {
    if (provider === "anthropic") return await callAnthropic(key, model, system, messages);
    if (provider === "openai") return await callOpenAI(key, model, system, messages);
    return await callGoogle(key, model, system, messages);
  } catch (err) {
    return { text: null, error: err instanceof Error ? err.message : "AI request failed" };
  }
}

async function callAnthropic(key: string, model: string, system: string, messages: ChatMessage[]): Promise<AIResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: 1024, system, messages }),
  });
  const data = await res.json();
  if (!res.ok) return { text: null, error: data?.error?.message || `Anthropic error (${res.status})` };
  return { text: data?.content?.[0]?.text ?? "" };
}

async function callOpenAI(key: string, model: string, system: string, messages: ChatMessage[]): Promise<AIResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  const data = await res.json();
  if (!res.ok) return { text: null, error: data?.error?.message || `OpenAI error (${res.status})` };
  return { text: data?.choices?.[0]?.message?.content ?? "" };
}

async function callGoogle(key: string, model: string, system: string, messages: ChatMessage[]): Promise<AIResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) return { text: null, error: data?.error?.message || `Gemini error (${res.status})` };
  return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "" };
}
