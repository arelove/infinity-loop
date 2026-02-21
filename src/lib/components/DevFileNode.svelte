<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { DevNodeData } from '$lib/devTypes';
  import { getGeminiKey } from '$lib/api';
  import { showSnackbar } from '$lib/components/Snackbar.svelte';
  import { createEventDispatcher } from 'svelte';

  interface Props {
    id: string;
    data: DevNodeData;
  }
  let { id, data }: Props = $props();

  const dispatch = createEventDispatcher<{ delete: { id: string } }>();

  // Local mutable copies for note editing

// Оставляем $state, но подавляем через унарный оператор (хак не нужен)
// Правильно: явно деструктурируем через $derived.by для read + $state для write
let title   = $state(data.title);
let content = $state(data.content);
// Подавляем предупреждение — говорим Svelte что это intentional:
// eslint-disable-next-line

  let isNote  = $derived(data.kind === 'note');
  let isPdf   = $derived(data.kind === 'pdf-page' || data.kind === 'pdf-section');

  let expanded     = $state(false);
  let showAiPanel  = $state(false);
  let showPdfViewer= $state(false);
  let aiQuestion   = $state('');
  let aiAnswer     = $state('');
  let isAsking     = $state(false);

  // ── Language colours ─────────────────────────────────────────────────────
  const langLabel: Record<string, string> = {
    typescript:'TS', javascript:'JS', svelte:'Svelte', rust:'RS',
    python:'PY', go:'GO', markdown:'MD', json:'JSON', css:'CSS',
    html:'HTML', text:'TXT', toml:'TOML',
  };
  const langColor: Record<string, string> = {
    typescript:'#3178c6', javascript:'#f7df1e', svelte:'#ff3e00', rust:'#ce412b',
    python:'#3572a5', go:'#00acd7', markdown:'#083fa1', json:'#f7df1e',
    css:'#563d7c', html:'#e34c26', text:'#888', toml:'#9c4221',
  };

  let lang    = $derived(data.language ?? 'text');
  let preview = $derived((isNote ? content : data.content).slice(0, 600));
  let lines   = $derived((isNote ? content : data.content).split('\n').length);

  // ── AI ────────────────────────────────────────────────────────────────────
  async function askAI() {
    if (!aiQuestion.trim()) return;
    isAsking = true; aiAnswer = '';
    try {
      const key = await getGeminiKey();
      if (!key) { showSnackbar('Add your Gemini key in Settings', 'error'); return; }

      const fileContent = isNote ? content : data.content;
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text:
              `You are a helpful assistant. Answer about this ${isPdf ? 'document section' : lang + ' file'}.

${isPdf ? 'Section' : 'File'}: ${data.title}
---
${fileContent.slice(0, 8000)}
---

Question: ${aiQuestion}

Answer clearly and concisely.`
            }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
          }),
        }
      );
      const json = await resp.json();
      aiAnswer = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response';
    } catch (e) { aiAnswer = `Error: ${e}`; }
    finally { isAsking = false; }
  }

  function stopProp(e: Event) { e.stopPropagation(); }
</script>

<!-- Handles -->
<Handle type="target" position={Position.Top}
  style="width:8px;height:8px;background:rgba(99,179,237,0.5);border-color:rgba(99,179,237,0.3);" />

<!-- ── Node shell — NO nodrag here so the whole card is draggable ──────── -->
<div class="dev-node" class:is-note={isNote} class:is-pdf={isPdf}>

  <!-- ── DRAG HANDLE (header) ──────────────────────────────────────────── -->
  <!-- Header is the drag target; interactive elements inside use nodrag -->
  <div class="node-header drag-handle">

    <!-- Left: badge + title -->
    <div class="flex items-center gap-2 flex-1 min-w-0">
      {#if isPdf}
        <span class="badge" style="background:rgba(239,68,68,0.15);color:#f87171;border-color:rgba(239,68,68,0.2);">
          {data.page ? `P${data.page}` : 'PDF'}
        </span>
      {:else if isNote}
        <span class="badge" style="background:rgba(251,191,36,0.12);color:#fbbf24;border-color:rgba(251,191,36,0.2);">NOTE</span>
      {:else}
        <span class="badge"
          style="background:{langColor[lang]}18;color:{langColor[lang]};border-color:{langColor[lang]}30;">
          {langLabel[lang] ?? lang.toUpperCase()}
        </span>
      {/if}

      <!-- Title: editable for notes, static for files -->
      {#if isNote}
        <!-- nodrag on input so typing doesn't move node -->
        <input
          class="nodrag note-title-input"
          bind:value={title}
          onclick={stopProp}
          placeholder="Note title…"
        />
      {:else}
        <span class="text-white/70 text-xs font-medium truncate">{data.title}</span>
      {/if}
    </div>

    <!-- Right: meta + actions -->
    <div class="flex items-center gap-1 flex-shrink-0 nodrag">
      {#if !isNote}
        <span class="text-white/20 text-[10px] font-mono">{lines}L</span>
      {/if}

      <!-- PDF viewer toggle -->
      {#if isPdf}
        <button
          class="icon-btn"
          onclick={(e) => { e.stopPropagation(); showPdfViewer = !showPdfViewer; }}
          title="View content"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </button>
      {/if}

      <!-- Expand toggle -->
      {#if !isNote}
        <button
          class="icon-btn"
          onclick={(e) => { e.stopPropagation(); expanded = !expanded; }}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          <svg class="w-3 h-3 transition-transform duration-150" style={expanded ? 'transform:rotate(180deg)' : ''} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      {/if}

      <!-- Delete -->
      <button
        class="icon-btn delete-btn"
        onclick={(e) => { e.stopPropagation(); dispatch('delete', { id }); }}
        title="Delete node"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- ── BODY ──────────────────────────────────────────────────────────── -->

  {#if isNote}
    <!-- Note: editable textarea -->
    <textarea
      class="nodrag note-body"
      bind:value={content}
      onclick={stopProp}
      placeholder="Write your note here…"
      rows="5"
    ></textarea>

  {:else if showPdfViewer}
    <!-- PDF full content viewer -->
    <div class="nodrag pdf-viewer" role="presentation" onclick={stopProp} onkeydown={stopProp}>
      <p class="text-[10px] text-white/60 leading-relaxed whitespace-pre-wrap">
        {data.content || data.pdfText || '(no content extracted)'}
      </p>
    </div>

  {:else}
    <!-- Code / text preview -->
    <div class="relative overflow-hidden" style="max-height:{expanded ? '420px' : '130px'}">
      <div class="nodrag code-preview" role="presentation"
        onclick={stopProp}
        onkeydown={stopProp}
        style="max-height:{expanded ? '420px' : '130px'}"
      >{preview}{data.content.length > 600 ? '\n…' : ''}</div>
      {#if !expanded && data.content.length > 0}
        <div class="fade-out"></div>
      {/if}
    </div>
  {/if}

  <!-- ── ACTION BAR ─────────────────────────────────────────────────────── -->
  <div class="action-bar nodrag" role="presentation"
  onclick={stopProp} onkeydown={stopProp}>
    <button
      class="ai-btn"
      class:active={showAiPanel}
      onclick={() => (showAiPanel = !showAiPanel)}
    >
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
      Ask AI
    </button>
    {#if data.path && !isNote}
      <span class="path-hint">{data.path}</span>
    {/if}
  </div>

  <!-- ── AI PANEL ───────────────────────────────────────────────────────── -->
  {#if showAiPanel}
  <div class="ai-panel nodrag" role="presentation"
    onclick={stopProp}
    onkeydown={stopProp}
  >
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={aiQuestion}
        onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI(); } }}
        placeholder="Ask about this {isPdf ? 'section' : 'file'}…"
        class="ai-input"
      />
      <button onclick={askAI} disabled={isAsking || !aiQuestion.trim()} class="ai-send">
        {#if isAsking}
          <div class="w-3 h-3 border border-blue-400/40 border-t-blue-400 rounded-full animate-spin"></div>
        {:else}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
          </svg>
        {/if}
      </button>
    </div>
    {#if aiAnswer}
    <div class="ai-answer">{aiAnswer}</div>
    {/if}
  </div>
  {/if}

</div>

<Handle type="source" position={Position.Bottom}
  style="width:8px;height:8px;background:rgba(99,179,237,0.5);border-color:rgba(99,179,237,0.3);" />

<style>
  .dev-node {
    background: #141414;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.5);
    transition: border-color 0.2s, box-shadow 0.2s;
    width: 340px;
    cursor: default;
  }
  .dev-node:hover { border-color: rgba(99,179,237,0.25); }
  .dev-node.is-note { border-color: rgba(251,191,36,0.2); }
  .dev-node.is-note:hover { border-color: rgba(251,191,36,0.4); }
  .dev-node.is-pdf { border-color: rgba(239,68,68,0.15); }
  .dev-node.is-pdf:hover { border-color: rgba(239,68,68,0.3); }

  /* Drag handle — cursor grab on the header */
  .drag-handle {
    cursor: grab;
  }
  .drag-handle:active { cursor: grabbing; }

  .node-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .badge {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid;
    font-family: monospace;
    flex-shrink: 0;
  }

  .icon-btn {
    width: 20px; height: 20px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px;
    color: rgba(255,255,255,0.3);
    transition: background 0.15s, color 0.15s;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  .icon-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
  .delete-btn:hover { background: rgba(239,68,68,0.15); color: #f87171; }

  /* Note inputs */
  .note-title-input {
    flex: 1;
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.75);
    font-size: 11px;
    font-weight: 500;
    outline: none;
    min-width: 0;
  }
  .note-title-input::placeholder { color: rgba(255,255,255,0.2); }

  .note-body {
    width: 100%;
    min-height: 100px;
    resize: vertical;
    background: transparent;
    border: none;
    border-top: 1px solid rgba(251,191,36,0.1);
    color: rgba(255,255,255,0.65);
    font-size: 11px;
    line-height: 1.6;
    padding: 10px 12px;
    outline: none;
    font-family: inherit;
  }
  .note-body::placeholder { color: rgba(255,255,255,0.18); }

  /* PDF viewer */
  .pdf-viewer {
    max-height: 320px;
    overflow-y: auto;
    padding: 10px 12px;
    background: rgba(239,68,68,0.03);
    border-top: 1px solid rgba(239,68,68,0.1);
  }

  /* Code preview */
  .code-preview {
    font-size: 10px;
    line-height: 1.5;
    font-family: monospace;
    color: rgba(255,255,255,0.38);
    padding: 10px 12px;
    overflow-x: auto;
    overflow-y: auto;
    white-space: pre;
    tab-size: 2;
    background: transparent;
    border: none;
    width: 100%;
    box-sizing: border-box;
    cursor: text;
    user-select: text;
  }

  .fade-out {
    position: absolute;
    bottom: 0;
    left: 0; right: 0;
    height: 28px;
    background: linear-gradient(to top, #141414, transparent);
    pointer-events: none;
  }

  /* Action bar */
  .action-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .ai-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 500;
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.4);
    border: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .ai-btn:hover { background: rgba(99,179,237,0.1); color: rgba(99,179,237,0.9); }
  .ai-btn.active { background: rgba(99,179,237,0.15); color: rgb(96,165,250); }

  .path-hint {
    font-size: 9px;
    color: rgba(255,255,255,0.15);
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    margin-left: 4px;
  }

  /* AI panel */
  .ai-panel {
    padding: 10px;
    border-top: 1px solid rgba(99,179,237,0.15);
    background: rgba(99,179,237,0.04);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ai-input {
    flex: 1;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 11px;
    color: rgba(255,255,255,0.8);
    outline: none;
    transition: border-color 0.15s;
  }
  .ai-input:focus { border-color: rgba(99,179,237,0.4); }
  .ai-input::placeholder { color: rgba(255,255,255,0.2); }

  .ai-send {
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(99,179,237,0.15);
    border: 1px solid rgba(99,179,237,0.2);
    color: rgb(147,197,253);
    cursor: pointer;
    transition: background 0.15s;
    display: flex; align-items: center;
  }
  .ai-send:hover { background: rgba(99,179,237,0.25); }
  .ai-send:disabled { opacity: 0.3; cursor: not-allowed; }

  .ai-answer {
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    padding: 10px;
    font-size: 11px;
    color: rgba(255,255,255,0.7);
    line-height: 1.6;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    user-select: text;
    cursor: text;
  }
</style>