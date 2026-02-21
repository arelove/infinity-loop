<script lang="ts">
  import { getGeminiKey } from '$lib/api';
  import { showSnackbar } from '$lib/components/Snackbar.svelte';

  interface Props {
    projectName: string;
    onAddNote: () => void;
    onImportFiles: () => void;
    onImportFolder: () => void;
    onImportPdf: () => void;
    onSave: () => void;
    onClear: () => void;
    onIgnoreSettings: () => void;
  }
  let { projectName, onAddNote, onImportFiles, onImportFolder,
        onImportPdf, onSave, onClear, onIgnoreSettings }: Props = $props();

  let showProjectAI   = $state(false);
  let showImportMenu  = $state(false);
  let projectQuestion = $state('');
  let projectAnswer   = $state('');
  let isAsking        = $state(false);

  async function askProjectAI() {
    if (!projectQuestion.trim()) return;
    isAsking = true; projectAnswer = '';
    try {
      const key = await getGeminiKey();
      if (!key) { showSnackbar('Add Gemini key in Settings', 'error'); return; }
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text:
              `You are a software architect. Answer this high-level question about the project "${projectName}":\n${projectQuestion}\nBe concise and insightful.`
            }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: 512 },
          }),
        }
      );
      const json = await resp.json();
      projectAnswer = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response';
    } catch (e) { projectAnswer = `Error: ${e}`; }
    finally { isAsking = false; }
  }

  function closeMenus() { showImportMenu = false; showProjectAI = false; }
</script>

<!-- Toolbar -->
<div class="toolbar">

  <!-- Left: project indicator -->
  <div class="flex items-center gap-2 mr-2">
    <div class="status-dot"></div>
    <span class="project-name">{projectName}</span>
  </div>

  <div class="divider"></div>

  <!-- Add note -->
  <button class="tbtn" onclick={onAddNote} title="Add a blank note node">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4"/>
    </svg>
    Note
  </button>

  <!-- Import dropdown -->
  <div class="relative">
    <button class="tbtn" onclick={() => (showImportMenu = !showImportMenu)}>
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
      </svg>
      Import
      <svg class="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>

    {#if showImportMenu}
    <!-- Close on outside click -->
    <div class="fixed inset-0 z-10" onclick={closeMenus} role="none" style="background:transparent;"></div>

    <div class="import-menu">
      <button class="menu-item" onclick={() => { onImportFolder(); closeMenus(); }}>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
        </svg>
        Folder (recursive)
      </button>
      <button class="menu-item" onclick={() => { onImportFiles(); closeMenus(); }}>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
        Individual files
      </button>
      <button class="menu-item pdf" onclick={() => { onImportPdf(); closeMenus(); }}>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        PDF document
      </button>
      <div class="menu-divider"></div>
      <button class="menu-item muted" onclick={() => { onIgnoreSettings(); closeMenus(); }}>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        </svg>
        Ignore settings…
      </button>
    </div>
    {/if}
  </div>

  <!-- Ask about project -->
  <button
    class="tbtn"
    class:tbtn-active={showProjectAI}
    onclick={() => (showProjectAI = !showProjectAI)}
    title="Ask AI about the whole project"
  >
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
    </svg>
    Ask project
  </button>

  <!-- Spacer -->
  

  <!-- Save -->
  <button class="tbtn tbtn-save" onclick={onSave} title="Save project (Ctrl+S)">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
    </svg>
    Save
  </button>

  <!-- Clear -->
  <button class="tbtn tbtn-danger" onclick={onClear} title="Clear canvas">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
    </svg>
    Clear
  </button>
</div>

<!-- Project AI popover -->
{#if showProjectAI}
<div class="project-ai-panel">
  <div class="project-ai-header">
    <p style="font-size:11px;color:rgba(168,85,247,0.8);font-weight:600;">Ask about the whole project</p>
    <p style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px;">{projectName}</p>
  </div>
  <div style="padding:10px;display:flex;flex-direction:column;gap:8px;">
    <div style="display:flex;gap:8px;">
      <input
        type="text"
        bind:value={projectQuestion}
        onkeydown={(e) => e.key === 'Enter' && askProjectAI()}
        placeholder="e.g. What is the overall architecture?"
        class="ai-input"
      />
      <button onclick={askProjectAI} disabled={isAsking || !projectQuestion.trim()} class="ai-send">
        {#if isAsking}
          <div class="w-3.5 h-3.5 border border-purple-400/40 border-t-purple-400 rounded-full animate-spin"></div>
        {:else}→{/if}
      </button>
    </div>
    {#if projectAnswer}
    <div class="ai-answer">{projectAnswer}</div>
    {/if}
  </div>
</div>
{/if}

<style>
  .toolbar {
    position: absolute;
    top: 0; left: 0; right: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 18px 12px;
    background: rgba(13,13,13,0.95);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    backdrop-filter: blur(8px);
  }

  .status-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(99,179,237,0.6);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%,100% { opacity: 0.6; } 50% { opacity: 1; }
  }

  .project-name {
    font-size: 11px;
    font-family: monospace;
    color: rgba(255,255,255,0.45);
    letter-spacing: 0.05em;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .divider {
    width: 1px; height: 16px;
    background: rgba(255,255,255,0.07);
    margin: 0 4px;
  }

  .tbtn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 11px;
    color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .tbtn:hover {
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.75);
    border-color: rgba(255,255,255,0.12);
  }
  .tbtn-active {
    background: rgba(168,85,247,0.12) !important;
    color: rgba(192,132,252,0.9) !important;
    border-color: rgba(168,85,247,0.25) !important;
  }
  .tbtn-save {
    background: rgba(99,179,237,0.08);
    border-color: rgba(99,179,237,0.15);
    color: rgba(99,179,237,0.7);
  }
  .tbtn-save:hover {
    background: rgba(99,179,237,0.15);
    color: rgba(147,210,255,0.9);
  }
  .tbtn-danger:hover {
    background: rgba(239,68,68,0.1);
    color: #f87171;
    border-color: rgba(239,68,68,0.2);
  }

  /* Import dropdown menu */
  .import-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 20;
    background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    min-width: 180px;
  }
  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 9px 14px;
    font-size: 11px;
    color: rgba(255,255,255,0.55);
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s, color 0.12s;
  }
  .menu-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); }
  .menu-item.pdf { color: rgba(248,113,113,0.7); }
  .menu-item.pdf:hover { background: rgba(239,68,68,0.08); color: #f87171; }
  .menu-item.muted { color: rgba(255,255,255,0.3); }
  .menu-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 3px 0; }

  /* Project AI panel */
  .project-ai-panel {
    position: absolute;
    top: 52px;
    left: 12px;
    z-index: 20;
    width: 360px;
    background: #111;
    border: 1px solid rgba(168,85,247,0.2);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
  }
  .project-ai-header {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(168,85,247,0.1);
  }

  .ai-input {
    flex: 1;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 7px 10px;
    font-size: 11px;
    color: rgba(255,255,255,0.8);
    outline: none;
    transition: border-color 0.15s;
  }
  .ai-input:focus { border-color: rgba(168,85,247,0.4); }
  .ai-input::placeholder { color: rgba(255,255,255,0.2); }

  .ai-send {
    padding: 7px 12px;
    border-radius: 8px;
    background: rgba(168,85,247,0.15);
    border: 1px solid rgba(168,85,247,0.2);
    color: rgba(192,132,252,0.9);
    cursor: pointer;
    font-size: 12px;
    transition: background 0.15s;
    display: flex; align-items: center;
  }
  .ai-send:hover { background: rgba(168,85,247,0.25); }
  .ai-send:disabled { opacity: 0.3; cursor: not-allowed; }

  .ai-answer {
    background: rgba(0,0,0,0.35);
    border-radius: 8px;
    padding: 10px;
    font-size: 11px;
    color: rgba(255,255,255,0.65);
    line-height: 1.6;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
  }
</style>