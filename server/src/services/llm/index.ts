/**
 * LLM Provider Adapter - OpenAI-compatible protocol
 * Supports: DeepSeek, OpenAI, GLM (Zhipu), Moonshot (Kimi), Doubao, Qwen, Innospark
 * Based on ECNUClaw's multi-model adapter pattern
 */
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface LLMConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

// Provider presets - all use OpenAI-compatible protocol
const PROVIDER_PRESETS: Record<string, { baseUrl: string; defaultModel: string }> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  glm: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
  },
  moonshot: {
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
  },
  doubao: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-pro-32k',
  },
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
  },
  innospark: {
    baseUrl: 'https://innospark.cn/api/v1',
    defaultModel: 'innospark-chat',
  },
};

function getConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER || 'deepseek').toLowerCase();
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.deepseek;

  return {
    provider,
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || preset.baseUrl,
    model: process.env.LLM_MODEL || preset.defaultModel,
  };
}

function createClient(config?: LLMConfig): OpenAI {
  const cfg = config || getConfig();
  if (!cfg.apiKey) {
    throw new Error(
      `LLM_API_KEY not configured. Set environment variables:\n` +
      `  LLM_PROVIDER=deepseek|openai|glm|moonshot|doubao|qwen|innospark\n` +
      `  LLM_API_KEY=your-api-key\n` +
      `  LLM_BASE_URL=<optional-override>\n` +
      `  LLM_MODEL=<optional-override>`
    );
  }
  return new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseUrl,
  });
}

/**
 * Non-streaming chat completion
 */
export async function chatComplete(
  messages: ChatCompletionMessageParam[],
  options?: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<string> {
  const config = getConfig();
  const client = createClient(config);

  const fullMessages: ChatCompletionMessageParam[] = [];
  if (options?.systemPrompt) {
    fullMessages.push({ role: 'system', content: options.systemPrompt });
  }
  fullMessages.push(...messages);

  const response = await client.chat.completions.create({
    model: config.model,
    messages: fullMessages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Streaming chat completion via SSE
 * Calls onChunk for each text delta, onDone when finished, onError on failure
 */
export async function chatStream(
  messages: ChatCompletionMessageParam[],
  callbacks: StreamCallbacks,
  options?: { temperature?: number; maxTokens?: number; systemPrompt?: string }
): Promise<void> {
  const config = getConfig();
  const client = createClient(config);

  const fullMessages: ChatCompletionMessageParam[] = [];
  if (options?.systemPrompt) {
    fullMessages.push({ role: 'system', content: options.systemPrompt });
  }
  fullMessages.push(...messages);

  try {
    const stream = await client.chat.completions.create({
      model: config.model,
      messages: fullMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullText += delta;
        callbacks.onChunk(delta);
      }
    }
    callbacks.onDone(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Check if LLM is configured and available
 */
export function isLLMConfigured(): boolean {
  const config = getConfig();
  return !!config.apiKey;
}

/**
 * Get current LLM configuration (masked API key)
 */
export function getLLMStatus(): { configured: boolean; provider: string; model: string } {
  const config = getConfig();
  return {
    configured: !!config.apiKey,
    provider: config.provider,
    model: config.model,
  };
}
