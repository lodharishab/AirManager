import { storage } from "../storage";
import { config } from "../config";

export type AiProvider = "openai_compatible" | "sarvam";

export const AI_PROVIDERS: AiProvider[] = ["openai_compatible", "sarvam"];

const PROVIDER_DEFAULTS: Record<AiProvider, { baseUrl: string; model: string }> = {
  openai_compatible: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  sarvam: { baseUrl: "https://api.sarvam.ai/v1", model: "sarvam-105b" },
};

export interface AiConfig {
  provider: AiProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

const SETTING_KEYS = {
  provider: "ai.provider",
  baseUrl: "ai.baseUrl",
  apiKey: "ai.apiKey",
  model: "ai.model",
} as const;

function parseProvider(value: string | undefined): AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider) ? (value as AiProvider) : "openai_compatible";
}

export async function getAiConfig(): Promise<AiConfig> {
  const stored = await storage.getSettings("ai.");

  const provider = parseProvider(stored[SETTING_KEYS.provider]);
  const defaults = PROVIDER_DEFAULTS[provider];

  const envKey =
    process.env.OPENAI_API_KEY ||
    config.ai.apiKey ||
    process.env.SARVAM_API_KEY ||
    "";
  const envBaseUrl =
    process.env.OPENAI_BASE_URL ||
    config.ai.baseUrl ||
    (process.env.SARVAM_API_KEY && !process.env.OPENAI_API_KEY
      ? PROVIDER_DEFAULTS.sarvam.baseUrl
      : undefined);

  return {
    provider,
    baseUrl: stored[SETTING_KEYS.baseUrl] || envBaseUrl || defaults.baseUrl,
    apiKey: stored[SETTING_KEYS.apiKey] || envKey,
    model: stored[SETTING_KEYS.model] || defaults.model,
  };
}

export async function saveAiConfig(input: Partial<AiConfig>): Promise<AiConfig> {
  if (input.provider !== undefined) {
    if (!AI_PROVIDERS.includes(input.provider)) {
      throw new Error(`Unknown AI provider: ${input.provider}`);
    }
    await storage.setSetting(SETTING_KEYS.provider, input.provider);
  }

  const provider = parseProvider(
    input.provider ?? (await storage.getSetting(SETTING_KEYS.provider)),
  );
  const defaults = PROVIDER_DEFAULTS[provider];

  if (input.baseUrl !== undefined && input.baseUrl !== "") {
    await storage.setSetting(SETTING_KEYS.baseUrl, input.baseUrl.replace(/\/+$/, ""));
  } else if (input.baseUrl === "") {
    await storage.setSetting(SETTING_KEYS.baseUrl, defaults.baseUrl);
  }

  if (input.apiKey !== undefined && input.apiKey !== "") {
    await storage.setSetting(SETTING_KEYS.apiKey, input.apiKey);
  }

  if (input.model !== undefined && input.model !== "") {
    await storage.setSetting(SETTING_KEYS.model, input.model);
  }

  return getAiConfig();
}

function headers(cfg: AiConfig): Record<string, string> {
  if (cfg.provider === "sarvam") {
    return {
      "Content-Type": "application/json",
      "api-subscription-key": cfg.apiKey,
    };
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.apiKey}`,
  };
}

function chatUrl(cfg: AiConfig): string {
  return `${cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function aiChat(
  messages: AiMessage[],
  options: AiChatOptions = {},
  cfg?: AiConfig,
): Promise<string> {
  const aiCfg = cfg ?? (await getAiConfig());
  if (!aiCfg.apiKey) {
    throw new Error("AI is not configured. Set the provider API key in Settings.");
  }

  const res = await fetchWithTimeout(
    chatUrl(aiCfg),
    {
      method: "POST",
      headers: headers(aiCfg),
      body: JSON.stringify({
        model: options.model || aiCfg.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 900,
      }),
    },
    60_000,
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI response had no message content.");
  }
  return content;
}

export interface AiConnectionTestResult {
  ok: boolean;
  models?: string[];
  error?: string;
}

export async function testAiConnection(cfg: AiConfig): Promise<AiConnectionTestResult> {
  if (!cfg.apiKey) {
    return { ok: false, error: "No API key configured." };
  }

  try {
    const res = await fetchWithTimeout(
      `${cfg.baseUrl.replace(/\/+$/, "")}/models`,
      { method: "GET", headers: headers(cfg) },
      15_000,
    );

    if (res.ok) {
      const data = (await res.json()) as { data?: Array<{ id?: string }> };
      const models = (data.data || []).map((m) => m.id || "").filter(Boolean);
      return { ok: true, models };
    }

    if (res.status === 404 || res.status === 405) {
      // Provider without a models endpoint — verify with a minimal completion.
      await aiChat(
        [{ role: "user", content: "ping" }],
        { maxTokens: 1, temperature: 0 },
        cfg,
      );
      return { ok: true };
    }

    const body = await res.text().catch(() => "");
    return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
