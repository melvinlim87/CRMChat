// Multi-provider AI layer. Settings (provider, model, API keys) are stored in
// the Setting table under key "ai". Calls go directly to each provider's REST
// API. Most providers are OpenAI-compatible so they share one caller.
import { prisma } from "./prisma";

export type AIProvider = "anthropic" | "openai" | "google" | "groq" | "openrouter" | "ollama";

export type ModelOption = { id: string; label: string };

// Providers that speak the OpenAI chat-completions format, with their base URL.
const OPENAI_COMPATIBLE: Partial<Record<AIProvider, string>> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  ollama: process.env.OLLAMA_URL || "http://localhost:11434/v1",
};

// Providers that don't need an API key (e.g. a local Ollama server).
const KEYLESS: AIProvider[] = ["ollama"];

export const MODEL_CATALOG: Record<AIProvider, { label: string; free?: boolean; models: ModelOption[] }> = {
  groq: {
    label: "Groq (free)",
    free: true,
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fast)" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B" },
    ],
  },
  google: {
    label: "Google Gemini (free tier)",
    free: true,
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
  },
  openrouter: {
    label: "OpenRouter",
    models: [
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)" },
      { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (free)" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  ollama: {
    label: "Ollama (local, free)",
    free: true,
    models: [
      { id: "llama3.2", label: "Llama 3.2" },
      { id: "llama3.1", label: "Llama 3.1" },
      { id: "mistral", label: "Mistral" },
      { id: "qwen2.5", label: "Qwen 2.5" },
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
  anthropic: {
    label: "Anthropic (Claude)",
    models: [
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
    ],
  },
};

const PROVIDER_ORDER: AIProvider[] = ["groq", "google", "openrouter", "ollama", "openai", "anthropic"];

export type AIConfig = {
  provider: AIProvider;
  model: string;
  keys: Partial<Record<AIProvider, string>>;
};

const DEFAULT_CONFIG: AIConfig = { provider: "groq", model: "llama-3.3-70b-versatile", keys: {} };

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

export async function getAIPublicSettings() {
  const cfg = await getAIConfig();
  const keysSet = {} as Record<AIProvider, boolean>;
  for (const p of PROVIDER_ORDER) keysSet[p] = KEYLESS.includes(p) || Boolean(cfg.keys[p]);
  return { provider: cfg.provider, model: cfg.model, keysSet, providerOrder: PROVIDER_ORDER };
}

export async function saveAIConfig(input: {
  provider?: AIProvider;
  model?: string;
  keys?: Partial<Record<AIProvider, string>>;
}): Promise<void> {
  const current = await getAIConfig();
  const keys = { ...current.keys };
  for (const p of PROVIDER_ORDER) {
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

// Appended to every assistant system prompt so replies match the customer's language.
export const REPLY_RULES =
  "Always reply in the same language the customer is using (e.g. English, 中文, Malay). Mirror their tone.";

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

  if (!KEYLESS.includes(provider) && !key) {
    return { text: null, error: `No API key set for ${MODEL_CATALOG[provider].label}. Add one in Settings.` };
  }

  try {
    if (provider === "anthropic") return await callAnthropic(key!, model, system, messages);
    if (provider === "google") return await callGoogle(key!, model, system, messages);
    const baseURL = OPENAI_COMPATIBLE[provider];
    if (baseURL) return await callOpenAICompatible(baseURL, key || "ollama", model, system, messages);
    return { text: null, error: "Unknown provider" };
  } catch (err) {
    return { text: null, error: err instanceof Error ? err.message : "AI request failed" };
  }
}

async function callOpenAICompatible(baseURL: string, key: string, model: string, system: string, messages: ChatMessage[]): Promise<AIResult> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { text: null, error: data?.error?.message || `AI error (${res.status})` };
  return { text: data?.choices?.[0]?.message?.content ?? "" };
}

async function callAnthropic(key: string, model: string, system: string, messages: ChatMessage[]): Promise<AIResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 1024, system, messages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { text: null, error: data?.error?.message || `Anthropic error (${res.status})` };
  return { text: data?.content?.[0]?.text ?? "" };
}

async function callGoogle(key: string, model: string, system: string, messages: ChatMessage[]): Promise<AIResult> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { text: null, error: data?.error?.message || `Gemini error (${res.status})` };
  return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "" };
}
