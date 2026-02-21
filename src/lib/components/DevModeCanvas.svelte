<script lang="ts">
  import {
    SvelteFlow, Controls, MiniMap, Background, BackgroundVariant,
    type Node, type Edge,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { writable } from 'svelte/store';
  import dagre from '@dagrejs/dagre';
  import DevFileNode   from './DevFileNode.svelte';
  import DevFolderNode from './DevFolderNode.svelte';
  import PdfSplitModal from './PdfSplitModal.svelte';
  import DevToolbar    from './DevToolbar.svelte';
  import IgnoreModal   from './IgnoreModal.svelte';
  import LayoutPicker  from './LayoutPicker.svelte';
  import {
    type DevNodeData, type PdfSplitOptions, type DevSession,
    DEFAULT_IGNORE_PATTERNS, shouldIgnore,
  } from '$lib/devTypes';
  import { generateId } from '$lib/SessionStore';
  import { getGeminiKey } from '$lib/api';
  import { invoke } from '@tauri-apps/api/core';
  import { showSnackbar } from '$lib/components/Snackbar.svelte';
  import { translate } from '$lib/i18n'; // ← ДОБАВЛЕНО

  // ── Props ─────────────────────────────────────────────────────────────────
  // ← ДОБАВЛЕНО: принимаем DEV-сессию из галереи
  interface Props {
    initialSession?: DevSession | null;
  }
  let { initialSession = null }: Props = $props();

  // ── Stores ────────────────────────────────────────────────────────────────
  const nodesStore = writable<Node[]>([]);
  const edgesStore  = writable<Edge[]>([]);

  // ── State ─────────────────────────────────────────────────────────────────
  let isDraggingOver  = $state(false);
  let pdfSplitTarget  = $state<{ file: File; pageCount: number } | null>(null);
  let projectName     = $state('Untitled project');
  let isProcessing    = $state(false);
  let processingMsg   = $state('');
  let showIgnoreModal = $state(false);
  let ignorePatterns  = $state<string[]>([...DEFAULT_IGNORE_PATTERNS]);
  let currentLayout   = $state('tb');

  // ← ДОБАВЛЕНО: восстанавливаем сессию когда проп приходит из галереи
  $effect(() => {
    if (initialSession) {
      projectName    = initialSession.projectName ?? initialSession.title ?? 'Untitled project';
      ignorePatterns = initialSession.ignorePatterns ?? [...DEFAULT_IGNORE_PATTERNS];
      nodesStore.set(initialSession.nodes ?? []);
      edgesStore.set(initialSession.edges ?? []);
    }
  });

  // ── Node types ────────────────────────────────────────────────────────────
  const nodeTypes = {
    devFile:   DevFileNode   as any,
    devFolder: DevFolderNode as any,
  };

  const FILE_W = 340, FOLDER_W = 200, FOLDER_H = 72;

  // ── Layout engine ─────────────────────────────────────────────────────────
  function nodeSize(n: Node) {
    return n.type === 'devFolder'
      ? { w: FOLDER_W, h: FOLDER_H }
      : { w: FILE_W,   h: 260 };
  }

  // Dagre-based layouts (TB / LR / BT / RL)
  function dagreLayout(ns: Node[], es: Edge[], rankdir: 'TB'|'LR'|'BT'|'RL') {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    const isHoriz = rankdir === 'LR' || rankdir === 'RL';
    g.setGraph({
      rankdir,
      nodesep: isHoriz ? 40 : 50,
      ranksep: isHoriz ? 120 : 80,
      marginx: 60, marginy: 80,
    });
    ns.forEach(n => { const s = nodeSize(n); g.setNode(n.id, { width: s.w, height: s.h }); });
    es.forEach(e => g.setEdge(e.source, e.target));
    dagre.layout(g);
    return {
      nodes: ns.map(n => {
        const p = g.node(n.id); const s = nodeSize(n);
        return { ...n, position: { x: p.x - s.w / 2, y: p.y - s.h / 2 } };
      }),
      edges: es,
    };
  }

  // Radial layout — root at center, children in expanding rings
  function radialLayout(ns: Node[], es: Edge[]) {
    // Build adjacency / find root
    const childrenOf = new Map<string, string[]>();
    const hasParent  = new Set<string>();
    ns.forEach(n => childrenOf.set(n.id, []));
    es.forEach(e => { childrenOf.get(e.source)?.push(e.target); hasParent.add(e.target); });
    const roots = ns.filter(n => !hasParent.has(n.id));
    const rootId = roots[0]?.id ?? ns[0]?.id;
    const positions = new Map<string, { x: number; y: number }>();
    const BASE_RADIUS = 280;
    function place(id: string, angle: number, radius: number, spread: number) {
      positions.set(id, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
      const children = childrenOf.get(id) ?? [];
      if (!children.length) return;
      const step = spread / Math.max(children.length, 1);
      const startAngle = angle - spread / 2 + step / 2;
      children.forEach((child, i) => {
        place(child, startAngle + i * step, radius + BASE_RADIUS, spread * 0.85);
      });
    }
    place(rootId, -Math.PI / 2, 0, Math.PI * 2);
    return {
      nodes: ns.map(n => {
        const s = nodeSize(n);
        const pos = positions.get(n.id) ?? { x: 0, y: 0 };
        return { ...n, position: { x: pos.x - s.w / 2, y: pos.y - s.h / 2 } };
      }),
      edges: es,
    };
  }

  // Grid layout — pack all nodes into equal-spaced grid
  function gridLayout(ns: Node[], es: Edge[]) {
    const COLS = Math.ceil(Math.sqrt(ns.length));
    const COL_W = FILE_W + 50, ROW_H = 300;
    return {
      nodes: ns.map((n, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        const s = nodeSize(n);
        return { ...n, position: { x: col * COL_W - s.w / 2, y: row * ROW_H - s.h / 2 } };
      }),
      edges: es,
    };
  }

  // Force layout — simple spring simulation
  function forceLayout(ns: Node[], es: Edge[]) {
    // Initialise random positions
    const pos = new Map(ns.map(n => [
      n.id,
      { x: (Math.random() - 0.5) * 1000, y: (Math.random() - 0.5) * 800 },
    ]));
    const IDEAL = 400, REPULSE = 80000, ATTRACT = 0.03, DAMPING = 0.85;
    // Run 120 iterations
    for (let iter = 0; iter < 120; iter++) {
      const forces = new Map(ns.map(n => [n.id, { fx: 0, fy: 0 }]));
      // Repulsion between all pairs
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = pos.get(ns[i].id)!, b = pos.get(ns[j].id)!;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
          const force = REPULSE / (dist * dist);
          const nx = dx / dist, ny = dy / dist;
          forces.get(ns[i].id)!.fx -= force * nx;
          forces.get(ns[i].id)!.fy -= force * ny;
          forces.get(ns[j].id)!.fx += force * nx;
          forces.get(ns[j].id)!.fy += force * ny;
        }
      }
      // Attraction along edges
      es.forEach(e => {
        const a = pos.get(e.source), b = pos.get(e.target);
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
        const force = ATTRACT * (dist - IDEAL);
        const nx = dx / dist, ny = dy / dist;
        forces.get(e.source)!.fx += force * nx;
        forces.get(e.source)!.fy += force * ny;
        forces.get(e.target)!.fx -= force * nx;
        forces.get(e.target)!.fy -= force * ny;
      });
      ns.forEach(n => {
        const p = pos.get(n.id)!, f = forces.get(n.id)!;
        pos.set(n.id, { x: (p.x + f.fx) * DAMPING, y: (p.y + f.fy) * DAMPING });
      });
    }
    return {
      nodes: ns.map(n => {
        const s = nodeSize(n), p = pos.get(n.id)!;
        return { ...n, position: { x: p.x - s.w / 2, y: p.y - s.h / 2 } };
      }),
      edges: es,
    };
  }

  // Timeline — nodes sorted by depth on X axis, stacked vertically within each depth
  function timelineLayout(ns: Node[], es: Edge[]) {
    const depth = new Map<string, number>();
    const childrenOf = new Map<string, string[]>();
    const hasParent  = new Set<string>();
    ns.forEach(n => { depth.set(n.id, 0); childrenOf.set(n.id, []); });
    es.forEach(e => { childrenOf.get(e.source)?.push(e.target); hasParent.add(e.target); });
    const roots = ns.filter(n => !hasParent.has(n.id));
    // BFS to assign depths
    let queue = roots.map(r => r.id);
    while (queue.length) {
      const next: string[] = [];
      queue.forEach(id => {
        const d = depth.get(id)!;
        childrenOf.get(id)?.forEach(child => {
          if ((depth.get(child) ?? 0) <= d) {
            depth.set(child, d + 1);
            next.push(child);
          }
        });
      });
      queue = next;
    }
    const COL_W = FILE_W + 80, ROW_H = 300;
    const countAtDepth = new Map<number, number>();
    return {
      nodes: ns.map(n => {
        const d = depth.get(n.id) ?? 0;
        const row = countAtDepth.get(d) ?? 0;
        countAtDepth.set(d, row + 1);
        const s = nodeSize(n);
        return { ...n, position: { x: d * COL_W - s.w / 2, y: row * ROW_H - s.h / 2 } };
      }),
      edges: es,
    };
  }

  // ── Dispatcher ────────────────────────────────────────────────────────────
  function autoLayout(ns: Node[], es: Edge[], layout = currentLayout) {
    switch (layout) {
      case 'lr': return dagreLayout(ns, es, 'LR');
      case 'bt': return dagreLayout(ns, es, 'BT');
      case 'rl': return dagreLayout(ns, es, 'RL');
      case 'radial':   return radialLayout(ns, es);
      case 'grid':     return gridLayout(ns, es);
      case 'force':    return forceLayout(ns, es);
      case 'timeline': return timelineLayout(ns, es);
      default:         return dagreLayout(ns, es, 'TB');
    }
  }

  // ── Apply layout to current graph ─────────────────────────────────────────
  function applyLayout(layoutId: string) {
    currentLayout = layoutId;
    const ns = $nodesStore, es = $edgesStore;
    if (!ns.length) return;
    const laid = autoLayout(ns, es, layoutId);
    nodesStore.set(laid.nodes);
    edgesStore.set(laid.edges);
  }

  // ── Delete node (with optional cascade) ──────────────────────────────────
  function deleteNode(id: string, cascade = false) {
    if (!cascade) {
      nodesStore.update(ns => ns.filter(n => n.id !== id));
      edgesStore.update(es => es.filter(e => e.source !== id && e.target !== id));
      return;
    }
    // BFS to find all descendants
    const edges = $edgesStore;
    const toDelete = new Set<string>([id]);
    let queue = [id];
    while (queue.length) {
      const next: string[] = [];
      queue.forEach(pid => {
        edges.filter(e => e.source === pid).forEach(e => {
          if (!toDelete.has(e.target)) { toDelete.add(e.target); next.push(e.target); }
        });
      });
      queue = next;
    }
    nodesStore.update(ns => ns.filter(n => !toDelete.has(n.id)));
    edgesStore.update(es => es.filter(e => !toDelete.has(e.source) && !toDelete.has(e.target)));
  }

  // Handle events from node components
  function handleNodeEvent(e: CustomEvent) {
    const { id, cascade } = e.detail;
    deleteNode(id, cascade ?? false);
  }

  // ── Drop zone ─────────────────────────────────────────────────────────────
  function onDragOver(ev: DragEvent) { ev.preventDefault(); isDraggingOver = true; }
    function onDragLeave(ev: DragEvent) {
    if (!(ev.currentTarget as Element).contains(ev.relatedTarget as unknown as globalThis.Node)) {
      isDraggingOver = false;
    }
}

  async function onDrop(ev: DragEvent) {
    ev.preventDefault();
    isDraggingOver = false;
    const items = [...(ev.dataTransfer?.items ?? [])];
    if (!items.length) return;

    const pdfItem = items.find(i => i.kind === 'file' && i.type === 'application/pdf');
    if (pdfItem) {
      const file = pdfItem.getAsFile();
      if (file) { await handlePdfDrop(file); return; }
    }

    // Collect all files recursively via webkitGetAsEntry
    const allFiles: File[] = [];
    const entries = items.map(i => i.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];

    async function readEntry(entry: FileSystemEntry, basePath = ''): Promise<void> {
      if (entry.isFile) {
        await new Promise<void>(res => {
          (entry as FileSystemFileEntry).file(f => {
            // Attach relative path
            Object.defineProperty(f, 'webkitRelativePath', {
              value: basePath ? `${basePath}/${f.name}` : f.name,
              configurable: true,
            });
            allFiles.push(f);
            res();
          });
        });
      } else if (entry.isDirectory) {
        const dirName = entry.name;
        if (shouldIgnore(dirName, ignorePatterns)) return;
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        await new Promise<void>(res => {
          reader.readEntries(async (childEntries) => {
            for (const child of childEntries) {
              await readEntry(child, basePath ? `${basePath}/${dirName}` : dirName);
            }
            res();
          });
        });
      }
    }

    for (const entry of entries) {
      await readEntry(entry);
    }

    if (allFiles.length) await handleCodeDrop(allFiles);
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  async function handlePdfDrop(file: File) {
    const pageCount = await getPdfPageCount(file);
    pdfSplitTarget = { file, pageCount };
  }

  async function getPdfPageCount(file: File): Promise<number> {
    const buf = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(buf);
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    return Math.max(matches?.length ?? 1, 1);
  }

  async function handlePdfSplit(opts: PdfSplitOptions) {
    if (!pdfSplitTarget) return;
    const { file } = pdfSplitTarget;
    pdfSplitTarget = null;
    projectName = file.name.replace(/\.pdf$/i, '');
    if (opts.mode === 'pages') await splitPdfByPages(file, opts.pageCount);
    else await splitPdfByAI(file, opts.prompt, opts.nodeCount ?? 8);
  }


  async function splitPdfByPages(file: File, pageCount: number) {
    isProcessing = true;
    const nodes: Node[] = [];
    const edges: Edge[]  = [];
    const rootId = generateId();
    nodes.push(makeFolder(rootId, file.name, ''));

    for (let i = 1; i <= pageCount; i++) {
      processingMsg = `Page ${i}/${pageCount}…`;
      const id = generateId();
      nodes.push(makeFileNode(id, `Page ${i}`, `[Content of page ${i}]`, 'text', `page-${i}`, 'pdf-page', i));
      edges.push(makeEdge(rootId, id));
    }

    const laid = autoLayout(nodes, edges);
    nodesStore.set(laid.nodes); edgesStore.set(laid.edges);
    isProcessing = false;
  }

  async function splitPdfByAI(file: File, customPrompt?: string, nodeCount = 8) {
    
  const prompt = customPrompt ?? `Split this document into ${nodeCount} logical sections...`;
  isProcessing = true;
  processingMsg = 'Reading PDF…';
  try {
    // Конвертируем в base64
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    const geminiKey = await getGeminiKey();
    if (!geminiKey) throw new Error('No Gemini key set');

    processingMsg = 'Gemini is analysing structure…';
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              // PDF напрямую — Gemini сам читает
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: base64,
                }
              },
              { text:
`Split this document into 5–12 logical semantic sections (chapters, topics, etc).
Return ONLY a valid JSON array, nothing else:
[{"title": "Section title", "content": "Section summary in 2-3 sentences"}]
Rules:
- No markdown fences
- No preamble or explanation  
- Content must be plain text, no quotes or special characters that break JSON
- Each content max 300 characters`
              }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${err.slice(0, 200)}`);
    }

    const data = await resp.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    
    // Безопасный парсинг
    let clean = raw.trim();
    // Вырезаем markdown если Gemini всё же добавил
    const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) clean = fenceMatch[1].trim();
    // Ищем JSON массив
    const arrayMatch = clean.match(/\[[\s\S]*\]/);
    if (!arrayMatch) throw new Error('Gemini did not return a JSON array');
    
    const sections: { title: string; content: string }[] = JSON.parse(arrayMatch[0]);


      processingMsg = `Creating ${sections.length} nodes…`;
      const nodes: Node[] = [];
      const edges: Edge[]  = [];
      const rootId = generateId();
      nodes.push(makeFolder(rootId, file.name, ''));

      sections.forEach((s, i) => {
        const id = generateId();
        nodes.push(makeFileNode(id, s.title, s.content, 'text', s.title, 'pdf-section', i + 1));
        edges.push(makeEdge(rootId, id));
      });

      const laid = autoLayout(nodes, edges);
      nodesStore.set(laid.nodes); edgesStore.set(laid.edges);
    } catch (e) {
      showSnackbar(`PDF analysis failed: ${e}`, 'error');
    } finally { isProcessing = false; }
  }

  // ── Code project ──────────────────────────────────────────────────────────
  async function handleCodeDrop(files: File[]) {
    // Filter ignored paths
    const filtered = files.filter(f => {
      const path = (f as any).webkitRelativePath ?? f.name;
      return !shouldIgnore(path, ignorePatterns);
    });

    if (!filtered.length) {
      showSnackbar('All files were filtered by ignore patterns', 'info'); return;
    }

    isProcessing = true;
    processingMsg = `Processing ${filtered.length} files…`;

    const byFolder = new Map<string, File[]>();

    filtered.forEach(f => {
      const rel = (f as any).webkitRelativePath ?? f.name;
      const parts = rel.split('/');
      if (parts.length > 1 && byFolder.size === 0) projectName = parts[0];
      const folderKey = parts.length > 2
        ? parts.slice(0, -1).join('/')
        : parts.length === 2 ? parts[0] : 'root';
      if (!byFolder.has(folderKey)) byFolder.set(folderKey, []);
      byFolder.get(folderKey)!.push(f);
    });

    const nodes: Node[] = [];
    const edges: Edge[]  = [];
    const folderIds = new Map<string, string>();

    // Root
    const rootId = generateId();
    folderIds.set('root', rootId);
    nodes.push(makeFolder(rootId, projectName, ''));

    // Folder nodes — build hierarchy
    const sortedFolders = [...byFolder.keys()]
      .filter(k => k !== 'root')
      .sort((a, b) => a.split('/').length - b.split('/').length);

    for (const folder of sortedFolders) {
      const id = generateId();
      folderIds.set(folder, id);
      const label = folder.split('/').pop() ?? folder;
      const parentPath = folder.split('/').slice(0, -1).join('/') || 'root';
      // find the deepest existing ancestor
      let parentId = folderIds.get(parentPath);
      if (!parentId) {
        // walk up
        const parts = parentPath.split('/');
        for (let i = parts.length - 1; i >= 0; i--) {
          parentId = folderIds.get(parts.slice(0, i + 1).join('/'));
          if (parentId) break;
        }
        parentId = parentId ?? rootId;
      }
      nodes.push(makeFolder(id, label, folder));
      edges.push(makeEdge(parentId, id));
    }

    // File nodes
    for (const [folder, folderFiles] of byFolder) {
      for (const file of folderFiles) {
        processingMsg = `Reading ${file.name}…`;
        const content = await file.text().catch(() => '[binary — cannot display]');
        const id = generateId();
        const rel = (file as any).webkitRelativePath ?? file.name;
        nodes.push(makeFileNode(id, file.name, content, detectLang(file.name), rel, 'file'));
        edges.push(makeEdge(folderIds.get(folder) ?? rootId, id));
      }
    }

    const laid = autoLayout(nodes, edges);
    nodesStore.set(laid.nodes);
    edgesStore.set(laid.edges);
    isProcessing = false;
    showSnackbar(`Imported ${filtered.length} files`, 'success');
  }

  // ── Manual note ───────────────────────────────────────────────────────────
  function addManualNote() {
    const id = generateId();
    const node = makeFileNode(id, 'New note', '', 'text', '', 'note');
    nodesStore.update(ns => [...ns, {
      ...node,
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
    }]);
  }

  // ── Save DEV session ──────────────────────────────────────────────────────
  async function saveDevSession() {
    try {
      // ← ИСПРАВЛЕНО: rawId используется и как имя файла И внутри JSON,
      // иначе loadSession ищет файл без префикса "dev_" и не находит его
      const rawId = `dev_${generateId()}`;
      const session: DevSession = {
        id: rawId,
        title: projectName,
        timestamp: new Date().toISOString(),
        projectName,
        nodes: $nodesStore,
        edges: $edgesStore,
        ignorePatterns,
      };
      await invoke('save_session', {
        id: rawId,
        data: JSON.stringify({ ...session, _type: 'dev' }),
      });
      showSnackbar(translate('dev_saved'), 'success');
    } catch (e) {
      showSnackbar(`${translate('error_save_failed')}: ${e}`, 'error');
    }
  }

  function clearCanvas() {
    nodesStore.set([]); edgesStore.set([]);
    projectName = 'Untitled project';
  }

  // ── Import via button (files OR folder) ──────────────────────────────────
  function triggerFileImport(mode: 'files' | 'folder' | 'pdf') {
    const input = document.createElement('input');
    input.type = 'file';
    if (mode === 'folder') {
      (input as any).webkitdirectory = true;
      input.multiple = true;
    } else if (mode === 'files') {
      input.multiple = true;
      input.accept = '.ts,.tsx,.js,.jsx,.svelte,.rs,.py,.go,.md,.json,.toml,.css,.html,.txt,.yaml,.yml,.sh,.env';
    } else {
      input.accept = 'application/pdf';
    }
    input.onchange = async () => {
      const files = [...(input.files ?? [])];
      if (!files.length) return;
      if (mode === 'pdf') {
        await handlePdfDrop(files[0]);
      } else {
        await handleCodeDrop(files);
      }
      input.value = '';
    };
    input.click();
  }

  // ── Factories ─────────────────────────────────────────────────────────────
  function makeFileNode(
    id: string, title: string, content: string,
    language: string, path: string,
    kind: DevNodeData['kind'] = 'file',
    page?: number,
  ): Node {
    const data: DevNodeData = { kind, title, content, language, path, page };
    return {
      id, type: 'devFile',
      data: data as unknown as Record<string, unknown>,
      position: { x: 0, y: 0 },
      style: `width:${FILE_W}px;`,
    };
  }

  function makeFolder(id: string, title: string, path: string): Node {
    const data: DevNodeData = { kind: 'folder', title, content: '', path };
    return {
      id, type: 'devFolder',
      data: data as unknown as Record<string, unknown>,
      position: { x: 0, y: 0 },
      style: `width:${FOLDER_W}px;`,
    };
  }

  function makeEdge(src: string, tgt: string): Edge {
    return {
      id: `e-${src}-${tgt}`, source: src, target: tgt,
      type: 'smoothstep', animated: false,
      style: 'stroke:rgba(99,179,237,0.3); stroke-width:1.5;',
    };
  }

  function detectLang(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const m: Record<string, string> = {
      ts:'typescript', tsx:'typescript', js:'javascript', jsx:'javascript',
      svelte:'svelte', rs:'rust', py:'python', go:'go', md:'markdown',
      json:'json', toml:'toml', css:'css', html:'html', txt:'text',
      yaml:'text', yml:'text', sh:'text', env:'text',
    };
    return m[ext] ?? 'text';
  }
</script>

<!-- Canvas root -->
<div
  class="canvas-root"
  role="application"
  aria-label="Canvas drop zone"
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
>
  <!-- Toolbar -->
  <DevToolbar
    {projectName}
    onAddNote={addManualNote}
    onImportFiles={() => triggerFileImport('files')}
    onImportFolder={() => triggerFileImport('folder')}
    onImportPdf={() => triggerFileImport('pdf')}
    onSave={saveDevSession}
    onClear={clearCanvas}
    onIgnoreSettings={() => (showIgnoreModal = true)}
  />
  
  <!-- Empty state -->
  {#if $nodesStore.length === 0 && !isProcessing}
  <div class="empty-state">
    <div class="drop-zone" class:active={isDraggingOver}>
      <div class="drop-corner tl"></div>
      <div class="drop-corner tr"></div>
      <div class="drop-corner bl"></div>
      <div class="drop-corner br"></div>

      <div class="drop-icon">
        <svg class="w-8 h-8" style="color:rgba(255,255,255,0.25)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
      </div>
      
      <div class="text-center">
        <p style="color:rgba(255,255,255,0.45);font-size:13px;font-weight:500;margin-bottom:4px;">
          {isDraggingOver ? 'Drop to import' : 'Drop your project here'}
        </p>
        <p style="color:rgba(255,255,255,0.18);font-size:11px;">
          Code folder · individual files · PDF
        </p>
      </div>

      <div class="drop-pills">
        {#each ['.ts', '.svelte', '.rs', '.py', 'folder', 'PDF'] as ext}
          <span class="pill">{ext}</span>
        {/each}
      </div>
    </div>
    <p class="empty-hint">OR USE THE TOOLBAR ABOVE TO ADD NODES</p>
  </div>
  {/if}
  
  <!-- Processing overlay -->
  {#if isProcessing}
  <div class="processing-overlay">
    <div class="w-8 h-8 border-2 rounded-full animate-spin"
      style="border-color:rgba(99,179,237,0.3);border-top-color:#63b3ed;"></div>
    <p style="color:rgba(255,255,255,0.55);font-size:13px;letter-spacing:0.05em;">{processingMsg}</p>
  </div>
  {/if}

  <!-- Drag overlay ring -->
  {#if isDraggingOver}
  <div class="drag-overlay">
    <span style="color:rgba(99,179,237,0.7);font-size:15px;font-weight:500;letter-spacing:0.2em;">DROP TO IMPORT</span>
  </div>
  {/if}

  <!-- Layout picker — floats over canvas bottom-left -->
  <div class="layout-picker-wrapper">
    <LayoutPicker current={currentLayout} onApply={applyLayout} />
  </div>
  
  <!-- SvelteFlow -->
  <SvelteFlow
  proOptions={{ hideAttribution: true }}
    nodes={nodesStore}
    edges={edgesStore}
    {nodeTypes}
    fitView
    fitViewOptions={{ padding: 0.15 }}
    colorMode="dark"
    minZoom={0.05}
    maxZoom={5}
    on:nodeclick={() => {}}
  >
    <Controls />
    <MiniMap />
   <Background variant={BackgroundVariant.Dots} gap={22} size={1} patternColor="rgba(255,255,255,0.2)" />
  </SvelteFlow>

</div>

<!-- Modals -->
{#if pdfSplitTarget}
  <PdfSplitModal
    fileName={pdfSplitTarget.file.name}
    pageCount={pdfSplitTarget.pageCount}
    onConfirm={handlePdfSplit}
    onCancel={() => (pdfSplitTarget = null)}
  />
{/if}

{#if showIgnoreModal}
  <IgnoreModal
    patterns={ignorePatterns}
    onSave={(p) => { ignorePatterns = p; showIgnoreModal = false; }}
    onClose={() => (showIgnoreModal = false)}
  />
{/if}

<style>
  .canvas-root {
    position: relative;
    width: 100%;
    height: 100%;
    background: #0d0d0d;
    overflow: hidden;
  }

  /* SvelteFlow node wrappers — remove default styling */
  :global(.svelte-flow__node-devFile),
  :global(.svelte-flow__node-devFolder) {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
  }

  .layout-picker-wrapper {
    position: absolute;
    top: 70px; /* above SvelteFlow Controls */
    left: 12px;
    z-index: 10;
  }

  .empty-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    user-select: none;
    z-index: 5;
  }

  .drop-zone {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    width: 460px;
    height: 300px;
    border-radius: 24px;
    border: 2px dashed rgba(255,255,255,0.08);
    transition: border-color 0.25s, background 0.25s;
  }
  .drop-zone.active {
    border-color: rgba(99,179,237,0.5);
    background: rgba(99,179,237,0.04);
  }

  .drop-corner {
    position: absolute;
    width: 10px; height: 10px;
    border-radius: 50%;
    background: rgba(99,179,237,0.3);
  }
  .drop-corner.tl { top: 12px; left: 12px; }
  .drop-corner.tr { top: 12px; right: 12px; }
  .drop-corner.bl { bottom: 12px; left: 12px; }
  .drop-corner.br { bottom: 12px; right: 12px; }

  .drop-icon {
    width: 60px; height: 60px;
    border-radius: 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
  }

  .drop-pills {
    display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
    pointer-events: auto;
  }
  .pill {
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    color: rgba(255,255,255,0.25);
    font-size: 10px;
    font-family: monospace;
  }

  .empty-hint {
    margin-top: 20px;
    color: rgba(255,255,255,0.12);
    font-size: 10px;
    letter-spacing: 0.15em;
  }

  .processing-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.72);
    backdrop-filter: blur(6px);
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .drag-overlay {
    position: absolute;
    inset: 16px;
    border-radius: 24px;
    border: 2px solid rgba(99,179,237,0.45);
    background: rgba(99,179,237,0.04);
    z-index: 30;
    pointer-events: none;
    display: flex; align-items: center; justify-content: center;
  }
</style>