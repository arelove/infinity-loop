<script lang="ts">
  import { saveApiKeys } from '$lib/api';
  import { t } from '$lib/i18n';
  import { showSnackbar } from '$lib/components/Snackbar.svelte';

  interface Props { open: boolean; onclose: () => void; }
  let { open, onclose }: Props = $props();

  let tavilyKey = $state('');
  let geminiKey = $state('');
  let saving    = $state(false);
  let saved     = $state(false);
  let error     = $state('');

  let highGraphics = $state(false);

  $effect(() => {
    if (open) {
      tavilyKey = localStorage.getItem('tavily_key') ?? '';
      geminiKey = localStorage.getItem('gemini_key') ?? '';
      highGraphics = localStorage.getItem('high_graphics') === 'true';
      error = ''; saved = false;
    }
  });

  async function handleSave() {
    saving = true; error = '';
    try {
      await saveApiKeys(tavilyKey, geminiKey);
      localStorage.setItem('tavily_key', tavilyKey);
      localStorage.setItem('gemini_key', geminiKey);
      localStorage.setItem('high_graphics', String(highGraphics));
      saved = true;
      showSnackbar($t('hint_keys_saved'), 'success');
      setTimeout(() => { saved = false; onclose(); }, 900);
    } catch (e) { error = String(e); }
    finally { saving = false; }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
    if (e.key === 'Enter' && !saving) handleSave();
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    onclick={onclose}
    onkeydown={handleKey}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
  <div class="bg-[#1a1a1a] border border-white/10 rounded-2xl p-7 w-full max-w-md shadow-2xl" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="none">
    <h2 class="text-base font-semibold text-white mb-1">{$t('settings_title')}</h2>
    <p class="text-xs text-white/35 mb-6">{$t('settings_description')}</p>

    <!-- Tavily key -->
    <label class="block mb-4">
      <span class="text-[10px] text-white/50 uppercase tracking-widest mb-1.5 block">{$t('settings_tavily_label')}</span>
      <input
        type="password"
        placeholder="tvly-…"
        bind:value={tavilyKey}
        class="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/25 transition-colors font-mono"
      />
      <!-- Inline hint -->
      <span class="mt-1.5 text-[10px] text-white/20 flex items-center gap-1">
        <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
        <a href="https://app.tavily.com" target="_blank" rel="noopener noreferrer" class="hover:text-white/40 transition-colors underline underline-offset-2">{$t('settings_get_tavily')}</a>
      </span>
    </label>

    <!-- Gemini key -->
    <label class="block mb-6">
      <span class="text-[10px] text-white/50 uppercase tracking-widest mb-1.5 block">{$t('settings_gemini_label')}</span>
      <input
        type="password"
        placeholder="AIza…"
        bind:value={geminiKey}
        class="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/25 transition-colors font-mono"
      />
      <span class="mt-1.5 text-[10px] text-white/20 flex items-center gap-1">
        <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" class="hover:text-white/40 transition-colors underline underline-offset-2">{$t('settings_get_gemini')}</a>
      </span>
    </label>

    <!-- High graphics toggle -->
  <label class="flex items-center gap-3 mb-6 cursor-pointer group">
    <div class="relative">
      <input
        type="checkbox"
        bind:checked={highGraphics}
        class="sr-only peer"
      />
      <div class="w-9 h-5 bg-white/10 rounded-full border border-white/10 peer-checked:bg-purple-600/60 peer-checked:border-purple-500/40 transition-all"></div>
      <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white/40 rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-white/90"></div>
    </div>
    <div>
      <span class="text-[10px] text-white/50 uppercase tracking-widest block">{$t('settings_high_graphics')}</span>
      <span class="text-[9px] text-white/20">{$t('settings_high_graphics_hint')}</span>
    </div>
  </label>

    {#if error}<p class="text-red-400 text-xs mb-4 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>{/if}

    <div class="flex gap-3">
      <button onclick={onclose} class="flex-1 py-3 rounded-xl border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/20 transition-colors">{$t('settings_cancel')}</button>
      <button onclick={handleSave} disabled={saving || (!tavilyKey && !geminiKey)} class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        {#if saved}{$t('settings_saved')}{:else if saving}{$t('settings_saving')}{:else}{$t('settings_save')}{/if}
      </button>
    </div>

    <!-- Hint: press Enter to save -->
    <p class="mt-3 text-center text-[9px] text-white/15 tracking-wide">Enter ↵ — {$t('settings_save')} &nbsp;·&nbsp; Esc — {$t('settings_cancel')}</p>
  </div>
</div>
{/if}