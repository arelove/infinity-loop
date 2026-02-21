<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import type { DevNodeData } from '$lib/devTypes';
  import { getGeminiKey } from '$lib/api';
  import { showSnackbar } from '$lib/components/Snackbar.svelte';
  import { createEventDispatcher } from 'svelte';

  interface Props { id: string; data: DevNodeData; }
  let { id, data }: Props = $props();

  const dispatch = createEventDispatcher<{ delete: { id: string; cascade: boolean } }>();

  let showAiPanel = $state(false);
  let aiQuestion  = $state('');
  let aiAnswer    = $state('');
  let isAsking    = $state(false);

  async function askModuleAI() {
    if (!aiQuestion.trim()) return;
    isAsking = true; aiAnswer = '';
    try {
      const key = await getGeminiKey();
      if (!key) { showSnackbar('Add your Gemini key in Settings', 'error'); return; }
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text:
              `You are a senior software architect. Answer about the module/folder: "${data.title}".
Path: ${data.path || 'root'}
Question: ${aiQuestion}
Be concise and helpful.`
            }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
          }),
        }
      );
      const json = await resp.json();
      aiAnswer = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response';
    } catch (e) { aiAnswer = `Error: ${e}`; }
    finally { isAsking = false; }
  }
</script>

<Handle type="target" position={Position.Top}
  style="width:8px;height:8px;background:rgba(168,85,247,0.5);border-color:rgba(168,85,247,0.3);" />

<!-- Whole node is draggable; nodrag only on interactive children -->
<div class="folder-node">

  <!-- Header = drag handle -->
  <div class="folder-header drag-handle">
    <!-- Folder icon -->
    <svg class="w-4 h-4 flex-shrink-0" style="color:rgba(168,85,247,0.6)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
    </svg>

    <span class="folder-title">{data.title}</span>

    <!-- Actions (nodrag) -->
    <div class="nodrag flex items-center gap-1">
      <!-- AI toggle -->
      <button
        class="folder-icon-btn"
        onclick={(e) => { e.stopPropagation(); showAiPanel = !showAiPanel; }}
        title="Ask AI about this module"
        style={showAiPanel ? 'color:rgba(168,85,247,0.9);background:rgba(168,85,247,0.15);' : ''}
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
      </button>

      <!-- Delete with cascade -->
      <button
        class="folder-icon-btn delete"
        onclick={(e) => { e.stopPropagation(); dispatch('delete', { id, cascade: true }); }}
        title="Delete folder and all children"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- AI panel -->
  {#if showAiPanel}
  <div class="nodrag ai-panel" role="presentation"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <div class="flex gap-1.5">
      <input
        type="text"
        bind:value={aiQuestion}
        onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); askModuleAI(); } }}
        placeholder="Ask about this module…"
        class="ai-input"
      />
      <button onclick={askModuleAI} disabled={isAsking || !aiQuestion.trim()} class="ai-send">
        {#if isAsking}
          <div class="w-3 h-3 border border-purple-400/40 border-t-purple-400 rounded-full animate-spin"></div>
        {:else}→{/if}
      </button>
    </div>
    {#if aiAnswer}
    <div class="ai-answer">{aiAnswer}</div>
    {/if}
  </div>
  {/if}

</div>

<Handle type="source" position={Position.Bottom}
  style="width:8px;height:8px;background:rgba(168,85,247,0.5);border-color:rgba(168,85,247,0.3);" />

<style>
  .folder-node {
    background: #18101f;
    border: 1px solid rgba(168,85,247,0.2);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(168,85,247,0.08);
    transition: border-color 0.2s;
    width: 200px;
  }
  .folder-node:hover { border-color: rgba(168,85,247,0.4); }

  .drag-handle { cursor: grab; }
  .drag-handle:active { cursor: grabbing; }

  .folder-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
  }

  .folder-title {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255,255,255,0.65);
    letter-spacing: 0.02em;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .folder-icon-btn {
    width: 20px; height: 20px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px;
    color: rgba(168,85,247,0.4);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .folder-icon-btn:hover { background: rgba(168,85,247,0.15); color: rgba(168,85,247,0.9); }
  .folder-icon-btn.delete:hover { background: rgba(239,68,68,0.15); color: #f87171; }

  .ai-panel {
    border-top: 1px solid rgba(168,85,247,0.12);
    background: rgba(168,85,247,0.05);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ai-input {
    flex: 1;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 7px;
    padding: 5px 8px;
    font-size: 10px;
    color: rgba(255,255,255,0.8);
    outline: none;
    transition: border-color 0.15s;
    min-width: 0;
  }
  .ai-input:focus { border-color: rgba(168,85,247,0.4); }
  .ai-input::placeholder { color: rgba(255,255,255,0.2); }

  .ai-send {
    padding: 5px 8px;
    border-radius: 7px;
    background: rgba(168,85,247,0.15);
    border: 1px solid rgba(168,85,247,0.2);
    color: rgba(192,132,252,0.9);
    cursor: pointer;
    font-size: 11px;
    transition: background 0.15s;
  }
  .ai-send:hover { background: rgba(168,85,247,0.25); }
  .ai-send:disabled { opacity: 0.3; cursor: not-allowed; }

  .ai-answer {
    background: rgba(0,0,0,0.3);
    border-radius: 6px;
    padding: 8px;
    font-size: 10px;
    color: rgba(255,255,255,0.6);
    line-height: 1.5;
    max-height: 120px;
    overflow-y: auto;
    white-space: pre-wrap;
  }
</style>