import type { Node, Edge } from '@xyflow/svelte';

export interface Source {
  title: string;
  url: string;
  author: string;
}

export interface ImageResult {
  url: string;
  description: string;
}

export interface SearchResponse {
  response: string;
  follow_up_questions: string[];
  contextual_query: string;
  sources: Source[];
  images: ImageResult[];
}

export interface ConversationMessage {
  user?: string;
  assistant?: string;
}

export interface SearchRequest {
  query: string;
  previous_conversation?: ConversationMessage[];
  concept?: string;
  follow_up_mode?: 'expansive' | 'focused';
}

// ── Graph node data ──────────────────────────────────────────────────────────

export interface MainNodeData {
  label: string;
  content: string;
  images?: string[];
  sources?: Source[];
  isExpanded: boolean;
  /** True while Gemini is streaming — raw text shown instead of parsed markdown */
  isStreaming?: boolean;
}

export interface QuestionNodeData {
  label: string;
  isExpanded: boolean;
}