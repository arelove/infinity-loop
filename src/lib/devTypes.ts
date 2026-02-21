// ── DEV Mode types ────────────────────────────────────────────────────────────

export type DevNodeKind = 'file' | 'folder' | 'pdf-page' | 'pdf-section' | 'note';

export interface DevNodeData {
  kind: DevNodeKind;
  title: string;
  content: string;
  language?: string;
  path?: string;
  page?: number;
  isLoading?: boolean;
  aiAnswer?: string;
  // PDF-specific: raw text for viewer
  pdfText?: string;
}

export type PdfSplitMode = 'pages' | 'ai';

export interface PdfSplitOptions {
  mode: PdfSplitMode;
  fileName: string;
  pageCount: number;
  prompt?: string;    // ← новое
  nodeCount?: number; // ← новое
}

// ── Ignore patterns (настраиваемые) ──────────────────────────────────────────

export const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  'target',
  '.svelte-kit',
  '.git',
  'build',
  'dist',
  '.env',
  '__pycache__',
  '.DS_Store',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
];

export function shouldIgnore(path: string, patterns: string[]): boolean {
  const parts = path.split('/');
  return parts.some(part => patterns.some(p => part === p || part.startsWith(p)));
}

// ── DEV Session (for saving) ──────────────────────────────────────────────────

export interface DevSession {
  id: string;
  title: string;
  timestamp: string;
  projectName: string;
  nodes: import('@xyflow/svelte').Node[];
  edges: import('@xyflow/svelte').Edge[];
  ignorePatterns: string[];
}