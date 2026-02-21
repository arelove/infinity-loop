<script lang="ts">
  import type { PdfSplitOptions, PdfSplitMode } from '$lib/devTypes';
  import PdfAiPromptModal from './PdfAiPromptModal.svelte';

  interface Props {
    fileName: string;
    pageCount: number;
    onConfirm: (opts: PdfSplitOptions) => void;
    onCancel: () => void;
  }

  let { fileName, pageCount, onConfirm, onCancel }: Props = $props();

  let selected = $state<PdfSplitMode>('pages');
  let showAiPrompt = $state(false)

  function confirm() {
    if (selected === 'ai') {
      showAiPrompt = true; // открываем prompt modal вместо сразу подтверждать
    } else {
      onConfirm({ mode: selected, fileName, pageCount });
    }
  }

  function handleAiConfirm(prompt: string, nodeCount: number) {
    showAiPrompt = false;
    onConfirm({ mode: 'ai', fileName, pageCount, prompt, nodeCount });
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter') confirm();
  }
</script>

<!-- Backdrop -->
 {#if showAiPrompt}
  <PdfAiPromptModal
    {fileName}
    {pageCount}
    onConfirm={handleAiConfirm}
    onCancel={() => showAiPrompt = false}
  />
{:else}
<div
  class="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-md"
  onclick={onCancel}
  onkeydown={handleKey}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div
    class="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="none"
  >
    <!-- Header -->
    <div class="px-6 pt-6 pb-4 border-b border-white/6">
      <div class="flex items-center gap-3 mb-1">
        <!-- PDF icon -->
        <div class="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div>
          <h2 class="text-sm font-semibold text-white">How to split this PDF?</h2>
          <p class="text-[11px] text-white/30">{fileName} · {pageCount} pages detected</p>
        </div>
      </div>
    </div>

    <!-- Options -->
    <div class="p-5 flex flex-col gap-3">

      <!-- Option: by pages -->
      <button
        onclick={() => (selected = 'pages')}
        class="group relative flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-150"
        class:border-blue-400={selected === 'pages'}
        class:bg-blue-500={selected === 'pages'}
        class:border-white={selected !== 'pages'}
        style={selected === 'pages'
          ? 'border-color:rgba(96,165,250,0.4);background:rgba(96,165,250,0.06);'
          : 'border-color:rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);'}
      >
        <!-- Radio -->
        <div class="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
          style={selected === 'pages' ? 'border-color:#60a5fa;' : 'border-color:rgba(255,255,255,0.2);'}
        >
          {#if selected === 'pages'}
            <div class="w-2 h-2 rounded-full bg-blue-400"></div>
          {/if}
        </div>

        <div>
          <p class="text-sm font-medium text-white/80 mb-1">By pages</p>
          <p class="text-[11px] text-white/35 leading-relaxed">
            Creates {pageCount} nodes — one per page.
            Fast, no AI needed. Best for structured PDFs with clear page boundaries.
          </p>
          <!-- Badge -->
          <span class="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-[10px] text-white/30">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Instant · {pageCount} nodes
          </span>
        </div>
      </button>

      <!-- Option: by AI -->
      <button
        onclick={() => (selected = 'ai')}
        class="group relative flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-150"
        style={selected === 'ai'
          ? 'border-color:rgba(167,139,250,0.4);background:rgba(167,139,250,0.06);'
          : 'border-color:rgba(255,255,255,0.07);background:rgba(255,255,255,0.02);'}
      >
        <!-- Radio -->
        <div class="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
          style={selected === 'ai' ? 'border-color:#a78bfa;' : 'border-color:rgba(255,255,255,0.2);'}
        >
          {#if selected === 'ai'}
            <div class="w-2 h-2 rounded-full bg-purple-400"></div>
          {/if}
        </div>

        <div>
          <p class="text-sm font-medium text-white/80 mb-1">By content <span class="text-[10px] font-normal text-purple-400/70 ml-1">✦ AI</span></p>
          <p class="text-[11px] text-white/35 leading-relaxed">
            Gemini analyses the document and creates semantic sections based on topics and chapters.
            Results in fewer, more meaningful nodes.
          </p>
          <span class="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/8 border border-purple-400/15 text-[10px] text-purple-400/60">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            Uses Gemini · 5–12 nodes
          </span>
        </div>
      </button>
    </div>

    <!-- Actions -->
    <div class="px-5 pb-5 flex gap-3">
      <button
        onclick={onCancel}
        class="flex-1 py-2.5 rounded-xl border border-white/8 text-xs text-white/40 hover:text-white hover:border-white/15 transition-colors"
      >Cancel</button>
      <button
        onclick={confirm}
        class="flex-1 py-2.5 rounded-xl text-xs font-medium text-white transition-all"
        style={selected === 'ai'
          ? 'background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.25);'
          : 'background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.25);'}
      >
        {selected === 'ai' ? '✦ Analyse with AI' : 'Split by pages'} →
      </button>
    </div>
  </div>
</div>
{/if}
