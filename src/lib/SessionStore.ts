/**
 * Sessionstore.ts
 * All persistence goes through Rust/Tauri commands.
 * Files live in the OS app-data directory — no IndexedDB, no localStorage.
 */

import { invoke } from '@tauri-apps/api/core';
import type { Node, Edge } from '@xyflow/svelte';
import type { ConversationMessage } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SavedSession {
  id: string;
  title: string;
  timestamp: string;
  currentConcept: string;
  conversationHistory: ConversationMessage[];
  /** Nodes with external image URLs replaced by base64 data URIs */
  nodes: Node[];
  edges: Edge[];
  /** Small base64 PNG — generated from the graph before saving */
  thumbnail?: string;
}

/** Lightweight card Rust returns for the gallery list (no node payload) */
export interface SessionMeta {
  id: string;
  title: string;
  timestamp: string;
  concept: string;
  node_count: number;
  thumbnail?: string;
  session_type: 'ai' | 'dev';  // ← NEW: populated by Rust based on _type field or id prefix
}

// ── Rust-backed CRUD ──────────────────────────────────────────────────────────

export async function saveSession(session: SavedSession): Promise<void> {
  return invoke('save_session', { id: session.id, data: JSON.stringify(session) });
}

export async function listSessions(): Promise<SessionMeta[]> {
  return invoke<SessionMeta[]>('list_sessions');
}

export async function loadSession(id: string): Promise<SavedSession> {
  const raw = await invoke<string>('load_session', { id });
  return JSON.parse(raw) as SavedSession;
}

export async function deleteSession(id: string): Promise<void> {
  return invoke('delete_session', { id });
}

// ── Image utilities ───────────────────────────────────────────────────────────

/**
 * Convert an external URL to a base64 JPEG data URI via Canvas.
 * Returns null when the image is CORS-blocked — caller decides fallback.
 */
export async function urlToBase64(url: string): Promise<string | null> {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width  = img.naturalWidth  || 400;
        c.height = img.naturalHeight || 400;
        c.getContext('2d')!.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.8));
      } catch {
        resolve(null); // canvas tainted by CORS
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Walk all nodes and replace external image URLs with base64.
 * Images that fail CORS are kept as-is so they still render in the app.
 * Call this before saveSession to make the stored file fully self-contained.
 */
export async function inlineNodeImages(nodes: Node[]): Promise<Node[]> {
  return Promise.all(
    nodes.map(async n => {
      const data = n.data as { images?: string[] };
      if (!data?.images?.length) return n;
      const inlined = await Promise.all(
        data.images.map(async url => (await urlToBase64(url)) ?? url)
      );
      return { ...n, data: { ...data, images: inlined } };
    })
  );
}

/**
 * Capture a tiny graph thumbnail PNG (no external images → no CORS errors).
 * Returns a base64 data URI or undefined on failure.
 *
 * Примечание: параметр filter в html-to-image принимает DOM HTMLElement,
 * а не XyFlow Node. Поэтому используем HTMLElement явно, чтобы избежать
 * конфликта имён с типом Node из @xyflow/svelte.
 */
export async function generateThumbnail(): Promise<string | undefined> {
  const { toPng } = await import('html-to-image');
  const el = document.querySelector('.svelte-flow') as HTMLElement | null;
  if (!el) return undefined;
  try {
    return await toPng(el, {
      backgroundColor: '#1a1a1a',
      pixelRatio: 0.35,
      // filter получает DOM-узел (HTMLElement), а не XyFlow Node
      filter: (domNode: HTMLElement) => !(domNode instanceof HTMLImageElement),
    });
  } catch {
    return undefined;
  }
}

/**
 * Full-resolution PNG export of the graph, also skipping external images.
 * Text, nodes and edges are captured; CORS images are simply omitted.
 */
export async function exportGraphPng(): Promise<void> {
  const { toPng } = await import('html-to-image');
  const el = document.querySelector('.svelte-flow') as HTMLElement | null;
  if (!el) throw new Error('Graph not mounted');

  const dataUrl = await toPng(el, {
    backgroundColor: '#1a1a1a',
    pixelRatio: 2,
    // filter получает DOM-узел (HTMLElement), а не XyFlow Node
    filter: (domNode: HTMLElement) => !(domNode instanceof HTMLImageElement),
  });

  const a    = document.createElement('a');
  a.href     = dataUrl;
  a.download = `rabbithole-${Date.now()}.png`;
  a.click();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}
