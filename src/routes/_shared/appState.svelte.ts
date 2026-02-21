/**
 * src/routes/_shared/appState.svelte.ts
 *
 * Весь реактивный стейт и бизнес-логика.
 * Ключевой момент: экспортируем ОДИН объект `app = $state({...})`.
 * Его свойства мутируемы из любого компонента (в отличие от `export let x = $state()`).
 */

import { writable } from 'svelte/store';
import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/svelte';
import type { DevSession } from '$lib/devTypes';
import { searchRabbithole } from '$lib/api';
import { translate } from '$lib/i18n';
import {
  saveSession, inlineNodeImages, generateThumbnail,
  exportGraphPng, generateId, type SavedSession,
} from '$lib/SessionStore';
import type { ConversationMessage, MainNodeData, QuestionNodeData } from '$lib/types';
import { showSnackbar } from '$lib/components/Snackbar.svelte';

// ── Единый реактивный объект ──────────────────────────────────────────────────
// Свойства объекта мутируемы из любого модуля, в отличие от `export let x = $state()`.

export const app = $state({
  query:               '',
  isLoading:           false,
  isSaving:            false,
  showSearch:          true,
  showSettings:        false,
  showGallery:         false,
  appMode:             'seek' as 'seek' | 'dev',
  conversationHistory: [] as ConversationMessage[],
  currentConcept:      '',
  activeRequests:      {} as Record<string, boolean>,
  devSession:          null as DevSession | null,
  deckQ:               { thoth: '', anubis: '', isis: '' } as Record<DeckKey, string>,
});

// ── Flow stores (writable — совместимы со SvelteFlow) ─────────────────────────

export const nodesStore = writable<Node[]>([]);
export const edgesStore  = writable<Edge[]>([]);

// ── Внутренние переменные ─────────────────────────────────────────────────────

export let currentController: AbortController | null = null;
const MAX_HISTORY = 6;

// ── Deck ──────────────────────────────────────────────────────────────────────

export const DECKS = {
  thoth:  [
    'What secrets lie in the cosmic patterns of consciousness?',
    'How do ancient symbols guide modern wisdom seekers?',
    'What hidden knowledge flows through the akashic records?',
  ],
  anubis: [
    'What lies beyond the veil between life and death?',
    'How do souls navigate the journey through the afterlife?',
    'What wisdom do ancestral spirits wish to share?',
  ],
  isis: [
    'How does ancient wisdom guide our modern understanding?',
    'What forgotten knowledge lies in the temples of antiquity?',
    'How do we unlock the mysteries of divine feminine power?',
  ],
} as const;

export type DeckKey = keyof typeof DECKS;
const rq = (k: DeckKey) => DECKS[k][Math.floor(Math.random() * DECKS[k].length)];

// Инициализируем deckQ
app.deckQ = { thoth: rq('thoth'), anubis: rq('anubis'), isis: rq('isis') };

// ── Dagre layout ──────────────────────────────────────────────────────────────

const NODE_W = 540, NODE_H = 520, Q_W = 260, Q_H = 70;

export function layoutElements(ns: Node[], es: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 180, marginx: 80, marginy: 80 });
  ns.forEach(n => {
    const m = n.type === 'mainNode';
    g.setNode(n.id, { width: m ? NODE_W : Q_W, height: m ? NODE_H : Q_H });
  });
  es.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: ns.map(n => {
      const p = g.node(n.id), m = n.type === 'mainNode';
      return { ...n, position: { x: p.x - (m ? NODE_W : Q_W) / 2, y: p.y - (m ? NODE_H : Q_H) / 2 } };
    }),
    edges: es,
  };
}

// ── Node factories ────────────────────────────────────────────────────────────

export function makeMain(id: string, data: MainNodeData): Node {
  return {
    id, type: 'mainNode',
    data: data as unknown as Record<string, unknown>,
    position: { x: 0, y: 0 },
    style: `width:${NODE_W}px; min-height:${NODE_H}px;`,
  };
}

export function makeQ(id: string, label: string): Node {
  return {
    id, type: 'default',
    data: { label, isExpanded: false } as unknown as Record<string, unknown>,
    position: { x: 0, y: 0 },
    style: `width:${Q_W}px; background:#1a1a1a; color:#fff; border:1px solid #333; border-radius:8px; font-size:13px; cursor:pointer; padding:10px 12px; white-space:normal; text-align:left;`,
  };
}

export function makeEdge(src: string, tgt: string): Edge {
  return {
    id: `e-${src}-${tgt}`, source: src, target: tgt,
    type: 'smoothstep', animated: true,
    style: 'stroke:rgba(255,255,255,.2); stroke-width:1.5;',
  };
}

// ── Deck click ────────────────────────────────────────────────────────────────

export function deckClick(key: DeckKey) {
  app.query = app.deckQ[key];
  app.deckQ = { ...app.deckQ, [key]: rq(key) };
  handleSearch();
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function handleSearch() {
  const q = app.query.trim();
  if (!q || app.isLoading) return;
  app.isLoading = true; app.showSearch = false;
  currentController?.abort(); currentController = new AbortController();
  nodesStore.set([makeMain('main', { label: q, content: 'Loading...', images: [], sources: [], isExpanded: true })]);
  edgesStore.set([]);
  try {
    const result = await searchRabbithole(
      { query: q, previous_conversation: app.conversationHistory, concept: app.currentConcept, follow_up_mode: 'expansive' },
      (chunk) => nodesStore.update(ns => ns.map(n =>
        n.id === 'main' ? makeMain('main', { ...(n.data as unknown as MainNodeData), content: chunk, isStreaming: true }) : n
      )),
      currentController.signal,
    );
    app.currentConcept = result.contextual_query || q;
    const mainNode = makeMain('main', {
      label: result.contextual_query || q, content: result.response,
      images: result.images.map(i => i.url), sources: result.sources,
      isExpanded: true, isStreaming: false,
    });
    const ts = Date.now();
    const qNodes = result.follow_up_questions.map((txt, i) => makeQ(`q-${i}-${ts}`, txt));
    const { nodes: laid, edges: laidE } = layoutElements([mainNode, ...qNodes], qNodes.map(n => makeEdge('main', n.id)));
    nodesStore.set(laid); edgesStore.set(laidE);
    showSnackbar(translate('hint_click_node'), 'info', 6000);
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    showSnackbar(`${translate('error_search_failed')}: ${e}`, 'error');
    app.showSearch = true;
  } finally { app.isLoading = false; }
}

// ── Expand node ───────────────────────────────────────────────────────────────

export function handleNodeClick(event: CustomEvent) {
  const node: Node = event.detail?.node ?? event.detail;
  if (!node || node.type === 'mainNode' || (node.data as unknown as QuestionNodeData).isExpanded) return;
  if (app.isLoading || Object.values(app.activeRequests).some(Boolean)) return;
  expandNode(node);
}

export async function expandNode(node: Node) {
  const id = node.id, label = (node.data as unknown as QuestionNodeData).label;
  app.activeRequests = { ...app.activeRequests, [id]: true };
  app.isLoading = true;

  let latestNodes: Node[] = [];
  nodesStore.subscribe(v => { latestNodes = v; })();
  const lastMain = latestNodes.find(n => n.type === 'mainNode');
  if (lastMain) {
    const d = lastMain.data as unknown as MainNodeData;
    app.conversationHistory = [
      ...app.conversationHistory.slice(-(MAX_HISTORY - 1)),
      { user: d.label, assistant: d.content },
    ];
  }

  nodesStore.update(ns => ns.map(n =>
    n.id === id ? makeMain(id, { label, content: 'Loading...', isExpanded: true }) : n
  ));
  currentController?.abort(); currentController = new AbortController();

  try {
    const result = await searchRabbithole(
      { query: label, previous_conversation: app.conversationHistory, concept: app.currentConcept, follow_up_mode: 'expansive' },
      (chunk) => nodesStore.update(ns => ns.map(n =>
        n.id === id ? makeMain(id, { ...(n.data as unknown as MainNodeData), content: chunk, isStreaming: true }) : n
      )),
      currentController.signal,
    );
    const ts = Date.now();
    const qNodes = result.follow_up_questions.map((txt, i) => makeQ(`q-${id}-${i}-${ts}`, txt));

    let latestEdges: Edge[] = [];
    edgesStore.subscribe(v => { latestEdges = v; })();

    nodesStore.update(ns => {
      const updated = ns.map(n =>
        n.id === id ? makeMain(id, {
          label: result.contextual_query || label, content: result.response,
          images: result.images.map(i => i.url), sources: result.sources,
          isExpanded: true, isStreaming: false,
        }) : n
      );
      const allEdges = [...latestEdges, ...qNodes.map(n => makeEdge(id, n.id))];
      const { nodes: laid, edges: laidE } = layoutElements([...updated, ...qNodes], allEdges);
      edgesStore.set(laidE); return laid;
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    showSnackbar(`${translate('error_expand_failed')}: ${e}`, 'error');
  } finally {
    const { [id]: _, ...rest } = app.activeRequests;
    app.activeRequests = rest;
    app.isLoading = false;
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────────

export function resetToSearch() {
  currentController?.abort(); currentController = null;
  app.showSearch = true; app.isLoading = false;
  app.activeRequests = {}; nodesStore.set([]); edgesStore.set([]);
  app.conversationHistory = []; app.currentConcept = ''; app.query = '';
}

// ── Save / Export / Import ────────────────────────────────────────────────────

export async function handleSaveGraph() {
  if (app.isSaving) return;
  app.isSaving = true;
  try {
    let ns: Node[] = [], es: Edge[] = [];
    nodesStore.subscribe(v => { ns = v; })();
    edgesStore.subscribe(v => { es = v; })();

    const mainNode = ns.find(n => n.type === 'mainNode');
    const title    = (mainNode?.data as unknown as MainNodeData)?.label ?? app.currentConcept ?? 'Untitled';
    const thumbnail    = await generateThumbnail();
    const inlinedNodes = await inlineNodeImages(ns);
    await saveSession({
      id: generateId(), title,
      timestamp: new Date().toISOString(),
      currentConcept: app.currentConcept,
      conversationHistory: app.conversationHistory,
      nodes: inlinedNodes, edges: es, thumbnail,
    });
    showSnackbar(translate('snack_saved'), 'success');
  } catch (e) {
    showSnackbar(`${translate('error_save_failed')}: ${e}`, 'error');
  } finally { app.isSaving = false; }
}

export async function handleExportPNG() {
  try {
    await exportGraphPng();
    showSnackbar(translate('snack_png_done'), 'success');
  } catch {
    showSnackbar(translate('error_png_failed'), 'error');
  }
}

export function handleLoadSession(session: SavedSession) {
  const raw = session as unknown as Record<string, unknown>;
  const isDevSession = raw['_type'] === 'dev' || String(raw['id'] ?? '').startsWith('dev_');

  if (isDevSession) {
    app.appMode    = 'dev';
    app.devSession = session as unknown as DevSession;
  } else {
    app.conversationHistory = session.conversationHistory ?? [];
    app.currentConcept      = session.currentConcept ?? '';
    nodesStore.set(session.nodes ?? []);
    edgesStore.set(session.edges ?? []);
    app.showSearch = false;
    app.devSession = null;
  }
}

export function handleImportJSON() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = async () => {
    const file = input.files?.[0]; if (!file) return;
    try {
      const session = JSON.parse(await file.text()) as SavedSession;
      if (!session.nodes) throw new Error(translate('error_invalid_file'));
      handleLoadSession(session);
    } catch (e) {
      showSnackbar(`${translate('error_import_failed')}: ${e}`, 'error');
    }
  };
  input.click();
}