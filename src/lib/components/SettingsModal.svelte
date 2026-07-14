<script lang="ts">
  import { getConfig, setConfig, PROVIDERS, type ConfigView, type ProviderId } from '$lib/api';
  import { t } from '$lib/i18n';
  import { showSnackbar } from '$lib/components/Snackbar.svelte';

  interface Props { open: boolean; onclose: () => void; }
  let { open, onclose }: Props = $props();

  let provider    = $state<ProviderId>('gemini');
  let model       = $state('');
  let ollamaUrl   = $state('');
  let tavilyKey   = $state('');
  let providerKey = $state('');

  let hasTavily      = $state(false);
  let hasProviderKey = $state(false);

  let highGraphics = $state(false);

  let saving = $state(false);
  let saved  = $state(false);
  let error  = $state('');

  // Which provider's boolean flag applies.
  function keyFlagFor(cfg: ConfigView, p: ProviderId): boolean {
    switch (p) {
      case 'gemini': return cfg.has_gemini;
      case 'openai': return cfg.has_openai;
      case 'xai':    return cfg.has_xai;
      case 'nvidia': return cfg.has_nvidia;
      case 'ollama': return true;
    }
  }

  let lastConfig: ConfigView | null = null;

  $effect(() => {
    if (!open) return;
    error = ''; saved = false;
    highGraphics = localStorage.getItem('high_graphics') === 'true';
    getConfig().then(cfg => {
      lastConfig     = cfg;
      provider       = cfg.provider;
      model          = cfg.model;
      ollamaUrl      = cfg.ollama_base_url;
      tavilyKey      = '';
      providerKey    = '';
      hasTavily      = cfg.has_tavily;
      hasProviderKey = keyFlagFor(cfg, cfg.provider);
    }).catch(e => { error = String(e); });
  });

  // Switching provider: reset the key field + model to that provider's defaults.
  function onProviderChange() {
    providerKey    = '';
    model          = '';
    hasProviderKey = lastConfig ? keyFlagFor(lastConfig, provider) : false;
  }

  let meta = $derived(PROVIDERS[provider]);
  let isOllama = $derived(provider === 'ollama');

  async function handleSave() {
    saving = true; error = '';
    try {
      const update: Record<string, string> = { provider, model };
      if (isOllama) update.ollama_base_url = ollamaUrl;
      if (tavilyKey.trim()) update.tavily_key = tavilyKey.trim();
      if (meta.keyField && providerKey.trim()) update[meta.keyField] = providerKey.trim();

      await setConfig(update);
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

  const inputCls =
    'w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/25 transition-colors font-mono';
</script>

{#if open}
  <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    onclick={onclose}
    onkeydown={handleKey}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
  <div class="bg-[#1a1a1a] border border-white/10 rounded-2xl p-7 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="none">
    <h2 class="text-base font-semibold text-white mb-1">{$t('settings_title')}</h2>
    <p class="text-xs text-white/35 mb-6">{$t('settings_description')}</p>

    <!-- Provider -->
    <label class="block mb-4">
      <span class="text-[10px] text-white/50 uppercase tracking-widest mb-1.5 block">{$t('settings_provider_label')}</span>
      <select bind:value={provider} onchange={onProviderChange}
        class="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/25 transition-colors">
        {#each Object.entries(PROVIDERS) as [id, p]}
          <option value={id}>{p.label}</option>
        {/each}
      </select>
      <span class="mt-1.5 text-[10px] text-white/20 block">{$t('settings_provider_hint')}</span>
    </label>

    <!-- Model -->
    <label class="block mb-4">
      <span class="text-[10px] text-white/50 uppercase tracking-widest mb-1.5 block">{$t('settings_model_label')}</span>
      <input list="model-suggestions" bind:value={model} placeholder={meta.defaultModel} class={inputCls} />
      <datalist id="model-suggestions">
        {#each meta.models as m}<option value={m}></option>{/each}
      </datalist>
      <span class="mt-1.5 text-[10px] text-white/20 block">{$t('settings_model_hint')}</span>
    </label>

    <!-- Provider key OR Ollama URL -->
    {#if isOllama}
      <label class="block mb-4">
        <span class="text-[10px] text-white/50 uppercase tracking-widest mb-1.5 block">{$t('settings_ollama_url_label')}</span>
        <input type="text" placeholder="http://localhost:11434" bind:value={ollamaUrl} class={inputCls} />
        <span class="mt-1.5 text-[10px] text-white/20 block">{$t('settings_ollama_hint')}</span>
      </label>
    {:else}
      <label class="block mb-4">
        <span class="text-[10px] text-white/50 uppercase tracking-widest mb-1.5 block">{meta.label} — {$t('settings_apikey_label')}</span>
        <input type="password" placeholder={hasProviderKey ? '••••••••••••' : 'sk-…'} bind:value={providerKey} class={inputCls} />
        <span class="mt-1.5 text-[10px] text-white/20 flex items-center gap-2">
          {#if hasProviderKey}<span class="text-emerald-400/60">{$t('settings_apikey_saved')}</span>{/if}
          {#if meta.keysUrl}<a href={meta.keysUrl} target="_blank" rel="noopener noreferrer" class="hover:text-white/40 transition-colors underline underline-offset-2">{$t('settings_get_key')}</a>{/if}
        </span>
      </label>
    {/if}

    <!-- Tavily key (always — powers web search) -->
    <label class="block mb-6">
      <span class="text-[10px] text-white/50 uppercase tracking-widest mb-1.5 block">{$t('settings_tavily_label')}</span>
      <input type="password" placeholder={hasTavily ? '••••••••••••' : 'tvly-…'} bind:value={tavilyKey} class={inputCls} />
      <span class="mt-1.5 text-[10px] text-white/20 flex items-center gap-1">
        <a href="https://app.tavily.com" target="_blank" rel="noopener noreferrer" class="hover:text-white/40 transition-colors underline underline-offset-2">{$t('settings_get_tavily')}</a>
      </span>
    </label>

    <!-- High graphics toggle -->
    <label class="flex items-center gap-3 mb-6 cursor-pointer group">
      <div class="relative">
        <input type="checkbox" bind:checked={highGraphics} class="sr-only peer" />
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
      <button onclick={handleSave} disabled={saving} class="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
        {#if saved}{$t('settings_saved')}{:else if saving}{$t('settings_saving')}{:else}{$t('settings_save')}{/if}
      </button>
    </div>

    <p class="mt-3 text-center text-[9px] text-white/15 tracking-wide">Enter ↵ — {$t('settings_save')} &nbsp;·&nbsp; Esc — {$t('settings_cancel')}</p>
  </div>
</div>
{/if}
