<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import type { MainNodeData } from '$lib/types';
  import BounceCards from './BounceCards.svelte';
  import { t } from '$lib/i18n';

  interface Props { data: MainNodeData; }
  let { data }: Props = $props();

  function getFavicon(url: string): string {
    try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; }
    catch { return ''; }
  }

  let parsed = $derived(
    data.content && data.content !== 'Loading...' && !data.isStreaming
      ? DOMPurify.sanitize(marked.parse(data.content) as string)
      : ''
  );
</script>

<div class="relative bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] shadow-2xl flex flex-col overflow-hidden" style="width:520px; min-height:480px; max-height:580px;">
  <Handle type="target" position={Position.Left} />

  {#if data.images && data.images.length > 0}
    <div class="flex-none bg-[#141414] pt-5 pb-2"><BounceCards images={data.images} /></div>
  {/if}

  <div class="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
    {#if data.content === 'Loading...'}
      <div class="flex flex-col items-center justify-center h-full min-h-[300px] space-y-6">
        <div class="relative w-16 h-16">
          <svg class="w-16 h-16 animate-spin-slow absolute inset-0" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <svg class="w-16 h-16 animate-reverse-spin absolute inset-0" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/><path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          <div class="absolute inset-0 flex items-center justify-center"><div class="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse"></div></div>
        </div>
        <div class="text-center">
          <div class="font-mystical text-white/50 tracking-[.25em] text-xs animate-pulse mb-1">{$t('node_loading_title')}</div>
          <div class="text-white/25 text-xs">{$t('node_loading_subtitle')}</div>
        </div>
      </div>

    {:else if data.isStreaming}
      <div class="prose-dark text-sm leading-relaxed whitespace-pre-wrap break-words">
        {data.content}<span class="inline-block w-0.5 h-4 bg-white/50 ml-0.5 animate-pulse align-middle"></span>
      </div>

    {:else}
      <div class="prose-dark text-sm leading-relaxed">{@html parsed}</div>

      {#if data.sources && data.sources.length > 0}
        <div class="mt-5 pt-4 border-t border-white/5">
          <p class="text-[10px] font-medium text-white/30 uppercase tracking-widest mb-3">{$t('node_sources')}</p>
          <div class="space-y-1.5">
            {#each data.sources as src}
              <a href={src.url} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                <img src={getFavicon(src.url)} alt="" class="w-4 h-4 flex-shrink-0" onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                <span class="text-xs text-white/40 group-hover:text-white/70 truncate transition-colors">{src.title || src.url}</span>
              </a>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <Handle type="source" position={Position.Right} />
</div>