<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { t } from '$lib/i18n';
  import { app, handleSearch, handleImportJSON, deckClick, type DeckKey } from '../_shared/appState.svelte';

  let thothEl  = $state<HTMLButtonElement | null>(null);
  let anubisEl = $state<HTMLButtonElement | null>(null);
  let isisEl   = $state<HTMLButtonElement | null>(null);

  function hoverAnim(el: HTMLElement) {
    let tl: gsap.core.Timeline | null = null;
    const on  = () => { tl?.kill(); tl = gsap.timeline({ repeat: -1, yoyo: true }).to(el, { y: -12, rotate: 2, duration: 2, ease: 'power1.inOut' }).to(el, { y: -6, rotate: -2, duration: 2, ease: 'power1.inOut' }); };
    const off = () => { tl?.kill(); gsap.to(el, { y: 0, rotate: 0, duration: 0.4, ease: 'power2.out' }); };
    el.addEventListener('mouseenter', on); el.addEventListener('mouseleave', off);
    return () => { el.removeEventListener('mouseenter', on); el.removeEventListener('mouseleave', off); };
  }

  onMount(() => {
    const cbs: (() => void)[] = [];
    if (thothEl)  cbs.push(hoverAnim(thothEl));
    if (anubisEl) cbs.push(hoverAnim(anubisEl));
    if (isisEl)   cbs.push(hoverAnim(isisEl));
    return () => cbs.forEach(f => f());
  });
</script>

<div class="min-h-screen bg-background flex flex-col items-center justify-center px-4 select-none">
  <h1 class="font-mystical text-4xl md:text-5xl text-white/90 tracking-[.15em] mb-2">{$t('landing_title')}</h1>
  <p class="text-white/30 text-xs tracking-[.3em] mb-14">{$t('landing_subtitle')}</p>

  <!-- Mystic cards -->
  <div class="flex gap-8 mb-14 items-end">
    <button bind:this={thothEl} onclick={() => deckClick('thoth')} class="cursor-pointer w-36 text-left bg-transparent border-0 p-0" title={$t('hint_deck')} type="button">
      <div class="relative w-full aspect-[2/3] group">
        <div class="absolute inset-0 bg-gradient-to-b from-[#222] to-[#0d0d0d] border border-white/10 rounded-xl flex items-center justify-center group-hover:border-white/25 transition-colors"><span class="text-white/25 text-4xl font-mystical select-none">⊕</span></div>
        <div class="absolute inset-0 bg-[#111]/90 border border-white/15 rounded-xl p-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div class="text-white/60 text-xs font-medium">{$t('deck_thoth')}</div>
          <div class="text-white/40 text-xs italic leading-relaxed">{app.deckQ.thoth}</div>
        </div>
      </div>
    </button>
    <button bind:this={anubisEl} onclick={() => deckClick('anubis')} class="cursor-pointer w-36 -mb-4 text-left bg-transparent border-0 p-0" title={$t('hint_deck')} type="button">
      <div class="relative w-full aspect-[2/3] group">
        <div class="absolute inset-0 bg-gradient-to-b from-[#222] to-[#0d0d0d] border border-white/10 rounded-xl flex items-center justify-center group-hover:border-white/25 transition-colors"><span class="text-white/25 text-4xl font-mystical select-none">⊗</span></div>
        <div class="absolute inset-0 bg-[#111]/90 border border-white/15 rounded-xl p-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div class="text-white/60 text-xs font-medium">{$t('deck_anubis')}</div>
          <div class="text-white/40 text-xs italic leading-relaxed">{app.deckQ.anubis}</div>
        </div>
      </div>
    </button>
    <button bind:this={isisEl} onclick={() => deckClick('isis')} class="cursor-pointer w-36 text-left bg-transparent border-0 p-0" title={$t('hint_deck')} type="button">
      <div class="relative w-full aspect-[2/3] group">
        <div class="absolute inset-0 bg-gradient-to-b from-[#222] to-[#0d0d0d] border border-white/10 rounded-xl flex items-center justify-center group-hover:border-white/25 transition-colors"><span class="text-white/25 text-4xl font-mystical select-none">⊙</span></div>
        <div class="absolute inset-0 bg-[#111]/90 border border-white/15 rounded-xl p-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div class="text-white/60 text-xs font-medium">{$t('deck_isis')}</div>
          <div class="text-white/40 text-xs italic leading-relaxed">{app.deckQ.isis}</div>
        </div>
      </div>
    </button>
  </div>

  <!-- Search input -->
  <div class="relative w-full max-w-lg">
    <input type="text"
      class="w-full px-6 py-4 rounded-full bg-[#111] text-white/90 border border-white/10 focus:border-white/25 outline-none placeholder-white/25 font-light tracking-wide text-sm transition-colors"
      bind:value={app.query}
      onkeydown={(e) => e.key === 'Enter' && handleSearch()}
      placeholder={$t('landing_placeholder')}
      disabled={app.isLoading} />
    {#if app.isLoading}
      <div class="absolute right-4 top-1/2 -translate-y-1/2"><div class="w-5 h-5 border border-white/20 border-t-white/70 rounded-full animate-spin"></div></div>
    {:else}
      <button onclick={handleSearch} class="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/5 transition-colors" title={$t('hint_search')}>
        <svg class="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </button>
    {/if}
  </div>

  <button onclick={handleImportJSON} class="mt-6 text-[10px] text-white/20 hover:text-white/40 tracking-widest uppercase transition-colors">↑ {$t('landing_load_session')}</button>
</div>