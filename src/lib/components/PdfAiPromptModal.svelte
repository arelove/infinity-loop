<script lang="ts">
  interface Props {
    fileName: string;
    pageCount: number;
    onConfirm: (prompt: string, nodeCount: number) => void;
    onCancel: () => void;
  }

  let { fileName, pageCount, onConfirm, onCancel }: Props = $props();

  let nodeCount = $state(Math.min(Math.max(5, Math.ceil(pageCount / 3)), 12));

  const DEFAULT_PROMPT = $derived(
`Split this document into ${nodeCount} logical semantic sections (chapters, topics, etc).
Return ONLY a valid JSON array, nothing else:
[{"title": "Section title", "content": "Section summary in 2-3 sentences"}]
Rules:
- No markdown fences
- No preamble or explanation
- Content must be plain text, no quotes or special characters that break JSON
- Each content max 300 characters`
  );

  let prompt = $state('');
  let isCustom = $state(false);

  // Sync prompt with default when nodeCount changes (unless user customised it)
  $effect(() => {
    if (!isCustom) prompt = DEFAULT_PROMPT;
  });

  function handlePromptInput(e: Event) {
    prompt = (e.target as HTMLTextAreaElement).value;
    isCustom = prompt !== DEFAULT_PROMPT;
  }

  function resetPrompt() {
    isCustom = false;
    prompt = DEFAULT_PROMPT;
  }

  function confirm() {
    onConfirm(prompt.trim(), nodeCount);
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirm();
  }

  const presets = [
    { label: 'Chapters', prompt: `Split into ${nodeCount} chapters or major sections. For each section provide a clear title and a 2-3 sentence summary of the key ideas covered.` },
    { label: 'Key concepts', prompt: `Extract the ${nodeCount} most important concepts, terms or ideas from this document. For each provide a title (the concept name) and a concise explanation.` },
    { label: 'Timeline', prompt: `Identify ${nodeCount} key events or phases described in this document in chronological order. For each provide a title (event/date) and a brief description.` },
    { label: 'Find specific', prompt: `Find all mentions of [TOPIC] in this document and group them into ${nodeCount} thematic clusters. Replace [TOPIC] with what you are looking for. For each cluster provide a title and summary.` },
  ];
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md"
  onclick={onCancel}
  onkeydown={handleKey}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div
    class="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="none"
  >
    <!-- Header -->
    <div class="px-6 pt-5 pb-4 border-b border-white/6 flex-shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-400/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </div>
        <div>
          <h2 class="text-sm font-semibold text-white">AI Analysis Settings</h2>
          <p class="text-[11px] text-white/30">{fileName} · {pageCount} pages</p>
        </div>
      </div>
    </div>

    <!-- Scrollable body -->
    <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

      <!-- Node count slider -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-[10px] text-white/50 uppercase tracking-widest">Number of nodes</label>
          <span class="text-sm font-semibold text-purple-300 tabular-nums">{nodeCount}</span>
        </div>
        <input
          type="range"
          min="3"
          max="50"
          bind:value={nodeCount}
          class="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style="background: linear-gradient(to right, rgba(167,139,250,0.7) 0%, rgba(167,139,250,0.7) {((nodeCount - 3) / 47) * 100}%, rgba(255,255,255,0.08) {((nodeCount - 3) / 47) * 100}%, rgba(255,255,255,0.08) 100%)"
        />
        <div class="flex justify-between mt-1">
          <span class="text-[9px] text-white/20">3</span>
          <span class="text-[9px] text-white/20">50</span>
        </div>
      </div>

      <!-- Presets -->
      <div>
        <label class="text-[10px] text-white/50 uppercase tracking-widest mb-2 block">Quick presets</label>
        <div class="flex flex-wrap gap-2">
          {#each presets as preset}
            <button
              onclick={() => { prompt = preset.prompt.replace(/\d+(?= logical| chapters| most| key| events)/g, String(nodeCount)); isCustom = true; }}
              class="px-3 py-1.5 rounded-lg border border-white/8 bg-white/3 text-[10px] text-white/40 hover:text-white/70 hover:border-white/15 hover:bg-white/6 transition-all"
            >
              {preset.label}
            </button>
          {/each}
          {#if isCustom}
            <button
              onclick={resetPrompt}
              class="px-3 py-1.5 rounded-lg border border-purple-400/20 bg-purple-500/8 text-[10px] text-purple-400/60 hover:text-purple-300 transition-all"
            >
              ↺ Reset to default
            </button>
          {/if}
        </div>
      </div>

      <!-- Prompt editor -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-[10px] text-white/50 uppercase tracking-widest">
            Prompt
            {#if isCustom}
              <span class="ml-1.5 text-[9px] text-purple-400/60 normal-case tracking-normal">· custom</span>
            {/if}
          </label>
          <span class="text-[9px] text-white/20">{prompt.length} chars</span>
        </div>
        <textarea
          value={prompt}
          oninput={handlePromptInput}
          rows="8"
          class="w-full bg-[#0d0d0d] border border-white/8 rounded-xl px-4 py-3 text-[11px] text-white/60 placeholder-white/20 outline-none focus:border-purple-400/30 transition-colors resize-none font-mono leading-relaxed"
          spellcheck="false"
        ></textarea>
        <p class="mt-1.5 text-[9px] text-white/20">
          The JSON format instruction is required — Gemini must return <code class="text-white/30">[{'{'}title, content{'}'}]</code> · Ctrl+Enter to confirm
        </p>
      </div>

    </div>

    <!-- Actions -->
    <div class="px-5 py-4 border-t border-white/6 flex gap-3 flex-shrink-0">
      <button
        onclick={onCancel}
        class="flex-1 py-2.5 rounded-xl border border-white/8 text-xs text-white/40 hover:text-white hover:border-white/15 transition-colors"
      >Cancel</button>
      <button
        onclick={confirm}
        class="flex-1 py-2.5 rounded-xl text-xs font-medium text-white transition-all flex items-center justify-center gap-1.5"
        style="background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);"
      >
        <svg class="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        Analyse with Gemini
      </button>
    </div>
  </div>
</div>

<style>
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(167, 139, 250, 0.9);
    cursor: pointer;
    border: 2px solid rgba(167, 139, 250, 0.3);
    box-shadow: 0 0 8px rgba(167, 139, 250, 0.4);
  }
  input[type='range']::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(167, 139, 250, 0.9);
    cursor: pointer;
    border: 2px solid rgba(167, 139, 250, 0.3);
    box-shadow: 0 0 8px rgba(167, 139, 250, 0.4);
  }
</style>