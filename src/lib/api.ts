import { invoke, Channel } from '@tauri-apps/api/core';
import type { SearchRequest, SearchResponse, Source, ImageResult } from './types';
import { translate } from './i18n';

// ── Providers ─────────────────────────────────────────────────────────────────

export type ProviderId = 'gemini' | 'openai' | 'xai' | 'nvidia' | 'ollama';

/** Config as exposed to the frontend — raw keys never leave Rust. */
export interface ConfigView {
  provider: ProviderId;
  model: string;
  ollama_base_url: string;
  has_tavily: boolean;
  has_gemini: boolean;
  has_openai: boolean;
  has_xai: boolean;
  has_nvidia: boolean;
}

/** Partial update — omit / leave key fields blank to keep the stored value. */
export interface ConfigUpdate {
  provider?: ProviderId;
  model?: string;
  ollama_base_url?: string;
  tavily_key?: string;
  gemini_key?: string;
  openai_key?: string;
  xai_key?: string;
  nvidia_key?: string;
}

/** UI metadata for each provider: label, default model, and suggestions. */
export const PROVIDERS: Record<
  ProviderId,
  { label: string; keyField: keyof ConfigUpdate | null; defaultModel: string; models: string[]; keysUrl?: string }
> = {
  gemini: {
    label: 'Google Gemini',
    keyField: 'gemini_key',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    keysUrl: 'https://aistudio.google.com/apikey',
  },
  openai: {
    label: 'OpenAI (ChatGPT)',
    keyField: 'openai_key',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
    keysUrl: 'https://platform.openai.com/api-keys',
  },
  xai: {
    label: 'xAI (Grok)',
    keyField: 'xai_key',
    defaultModel: 'grok-2-latest',
    models: ['grok-2-latest', 'grok-2-vision-latest', 'grok-beta'],
    keysUrl: 'https://console.x.ai',
  },
  nvidia: {
    label: 'NVIDIA NIM',
    keyField: 'nvidia_key',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    models: [
      'meta/llama-3.3-70b-instruct',
      'meta/llama-3.1-405b-instruct',
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'deepseek-ai/deepseek-r1',
    ],
    keysUrl: 'https://build.nvidia.com',
  },
  ollama: {
    label: 'Local (Ollama)',
    keyField: null, // no key — local server
    defaultModel: 'llama3.1',
    models: ['llama3.1', 'qwen2.5', 'mistral', 'phi3'],
  },
};

export async function getConfig(): Promise<ConfigView> {
  return invoke<ConfigView>('get_config');
}

export async function setConfig(update: ConfigUpdate): Promise<void> {
  return invoke('set_config', { update });
}

/** True when the active provider has everything it needs to run. */
export function providerReady(cfg: ConfigView): boolean {
  switch (cfg.provider) {
    case 'gemini':  return cfg.has_gemini;
    case 'openai':  return cfg.has_openai;
    case 'xai':     return cfg.has_xai;
    case 'nvidia':  return cfg.has_nvidia;
    case 'ollama':  return true; // local server, no key required
    default:        return false;
  }
}

// ── One-shot completion (Dev-mode helpers) ────────────────────────────────────

export async function llmComplete(
  user: string,
  opts: { system?: string; temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  return invoke<string>('llm_complete', {
    req: {
      user,
      system: opts.system,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.max_tokens ?? 1024,
    },
  });
}

/** PDF structural split — always routed through Gemini (native PDF reading). */
export async function analyzePdf(base64: string, prompt: string): Promise<string> {
  return invoke<string>('gemini_analyze_pdf', { base64, prompt });
}

// ── Parse LLM response ────────────────────────────────────────────────────────

function parseLlmResponse(rawText: string): { main: string; questions: string[] } {
  const separators = [
    'Follow-up Questions:',
    'Follow-Up Questions:',
    'Follow up Questions:',
    'Follow-up questions:',
    '**Follow-up Questions:**',
    '**Follow-Up Questions:**',
    '## Follow',
    '#### Follow',
    // Russian variants (when locale=ru and the model responds in Russian)
    'Дополнительные вопросы:',
    'Уточняющие вопросы:',
    'Вопросы для размышления:',
    '**Дополнительные вопросы:**',
  ];

  let mainPart      = rawText;
  let questionsPart = '';

  for (const sep of separators) {
    const idx = rawText.indexOf(sep);
    if (idx !== -1) {
      mainPart      = rawText.slice(0, idx).trim();
      questionsPart = rawText.slice(idx + sep.length).trim();
      break;
    }
  }

  const clean = (l: string) =>
    l.replace(/^\s*\d+[\.\)]\s*/, '').replace(/^\s*[-*•]\s*/, '').replace(/\*\*/g, '').trim();

  let questions =
    (questionsPart || rawText)
      .split('\n')
      .map(clean)
      .filter(l => l.length > 10 && l.includes('?'))
      .slice(questionsPart ? 0 : -3)
      .slice(0, 3);

  return { main: mainPart, questions };
}

// ── Main search (Tavily + streaming completion, all via Rust) ─────────────────

export async function searchRabbithole(
  request: SearchRequest,
  onChunk?: (accumulated: string) => void,
  requestId?: string,
): Promise<SearchResponse> {
  // Tavily via Rust (key stays in the backend)
  const tavily = await invoke<{
    sources: Source[];
    images: ImageResult[];
    query: string;
    summary: string;
  }>('tavily_search', { query: request.query });

  // ── Locale-aware prompt building ──────────────────────────────────────────
  const langInstruction = translate('prompt_language_instruction');

  const historyCtx = (request.previous_conversation ?? [])
    .map(m =>
      [m.user ? `User: ${m.user}` : '', m.assistant ? `Assistant: ${m.assistant}` : '']
        .filter(Boolean).join('\n')
    ).join('\n\n');

  const mode    = request.follow_up_mode ?? 'expansive';
  const concept = request.concept ?? request.query;

  // Prompts are always written in English for clarity and model reliability.
  // The langInstruction at the end tells the model which language to reply in.
  const systemPrompt = [
    `You are an AI assistant that helps users explore topics in depth.`,
    ``,
    `Format your response in two clearly separated parts:`,
    ``,
    `PART 1 — Main response:`,
    `Use markdown with #### headers. Be comprehensive and engaging.`,
    ``,
    `PART 2 — Must always end with this exact section:`,
    `Follow-up Questions:`,
    `1. [question related to search results]?`,
    `2. [thought-provoking question]?`,
    `3. [devil's advocate or unexpected angle question]?`,
    ``,
    `Always include "Follow-up Questions:" followed by exactly 3 numbered questions.`,
    langInstruction ? `\n${langInstruction}` : '',
  ].filter(s => s !== undefined).join('\n');

  const userMsg = [
    historyCtx ? `Previous conversation:\n${historyCtx}` : '',
    `Search results about "${request.query}":\n${tavily.summary}`,
    `Provide a comprehensive response about ${concept}. Be ${mode === 'expansive' ? 'broad and exploratory' : 'focused and specific'}.`,
    `IMPORTANT: End your response with:\nFollow-up Questions:\n1. ...?\n2. ...?\n3. ...?`,
    langInstruction ? langInstruction : '',
  ].filter(Boolean).join('\n\n');

  // Stream via Rust → provider. Deltas arrive on the Channel; we accumulate
  // and forward the running total to the caller (keeps the existing UI contract).
  const channel = new Channel<string>();
  let accumulated = '';
  channel.onmessage = (delta) => {
    accumulated += delta;
    onChunk?.(accumulated);
  };

  const full = await invoke<string>('llm_stream', {
    req: {
      system: systemPrompt,
      user: userMsg,
      temperature: 0.7,
      max_tokens: 2048,
    },
    onChunk: channel,
    requestId: requestId ?? crypto.randomUUID(),
  });

  const text = full || accumulated;
  if (!text) throw new Error('The model returned an empty response');

  const { main, questions } = parseLlmResponse(text);

  // Fallback questions — localised via i18n
  const fallback = [
    translate('fallback_question_implications').replace('{topic}', request.query),
    translate('fallback_question_history').replace('{topic}', request.query),
    translate('fallback_question_skeptic').replace('{topic}', request.query),
  ];

  return {
    response:             main,
    follow_up_questions:  questions.length > 0 ? questions : fallback,
    contextual_query: tavily.query,
    sources:          tavily.sources,
    images:           tavily.images,
  };
}

/** Ask Rust to stop an in-flight `searchRabbithole` stream by its request id. */
export async function cancelStream(requestId: string): Promise<void> {
  try { await invoke('cancel_stream', { requestId }); } catch { /* best effort */ }
}
