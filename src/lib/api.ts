import { invoke } from '@tauri-apps/api/core';
import type { SearchRequest, SearchResponse, Source, ImageResult } from './types';
import { getLocale, translate } from './i18n';

// ── Tauri key commands ────────────────────────────────────────────────────────

export async function saveApiKeys(tavilyKey: string, geminiKey: string): Promise<void> {
  return invoke('save_api_keys', { tavilyKey, geminiKey });
}

export async function saveTavilyKey(tavilyKey: string): Promise<void> {
  return invoke('save_tavily_key', { tavilyKey });
}

export async function saveGeminiKey(geminiKey: string): Promise<void> {
  return invoke('save_gemini_key', { geminiKey });
}

export async function getGeminiKey(): Promise<string> {
  return invoke<string>('get_gemini_key');
}

export async function getApiKeysStatus(): Promise<{ has_tavily: boolean; has_gemini: boolean }> {
  return invoke('get_api_keys_status');
}

// ── Parse Gemini response ─────────────────────────────────────────────────────

function parseGeminiResponse(rawText: string): { main: string; questions: string[] } {
  const separators = [
    'Follow-up Questions:',
    'Follow-Up Questions:',
    'Follow up Questions:',
    'Follow-up questions:',
    '**Follow-up Questions:**',
    '**Follow-Up Questions:**',
    '## Follow',
    '#### Follow',
    // Russian variants (when locale=ru and Gemini responds in Russian)
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

// ── Main search (Gemini SSE streaming) ───────────────────────────────────────

export async function searchRabbithole(
  request: SearchRequest,
  onChunk?: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const geminiKey = await getGeminiKey();
  if (!geminiKey) throw new Error(translate('hint_no_keys'));

  // Tavily via Rust
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
  // The langInstruction at the end tells Gemini which language to reply in.
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

  // Stream via SSE
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${geminiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini HTTP ${resp.status}: ${err.slice(0, 300)}`);
  }
  if (!resp.body) throw new Error('Gemini returned no response body');

  const reader  = resp.body.getReader();
  const decoder = new TextDecoder();
  let full   = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const chunk: string = JSON.parse(raw)?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (chunk) { full += chunk; onChunk?.(full); }
      } catch { /* malformed chunk */ }
    }
  }

  if (!full) throw new Error('Gemini returned empty response');

  const { main, questions } = parseGeminiResponse(full);

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