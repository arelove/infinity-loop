<script lang="ts">
  import {
    SvelteFlow, Controls, MiniMap, Background, BackgroundVariant,
    type NodeTypes,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import MainNode from '$lib/components/MainNode.svelte';
  import { t } from '$lib/i18n';
  import {
    app, nodesStore, edgesStore, currentController,
    resetToSearch, handleSaveGraph, handleExportPNG, handleNodeClick,
  } from '../_shared/appState.svelte';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeTypes: NodeTypes = { mainNode: MainNode as any };
</script>

<div class="w-screen h-screen bg-background">
  <!-- Top-left toolbar -->
  <div class="absolute top-4 left-4 z-50 flex items-center gap-2">
    <button onclick={resetToSearch}
      class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/50 hover:text-white transition-colors"
      title={$t('tooltip_new_search')}>
      {$t('graph_new_search')}
    </button>

    <button onclick={handleSaveGraph} disabled={app.isSaving}
      class="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/40 hover:text-white transition-colors disabled:opacity-40"
      title={$t('hint_save')}>
      {#if app.isSaving}
        <div class="w-3.5 h-3.5 border border-white/30 border-t-white/70 rounded-full animate-spin"></div>
        {$t('graph_saving')}
      {:else}
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
        </svg>
        {$t('graph_save')}
      {/if}
    </button>

    <button onclick={handleExportPNG}
      class="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/40 hover:text-white transition-colors"
      title={$t('tooltip_png')}>
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      {$t('graph_png')}
    </button>

    {#if app.isLoading}
      <button
        onclick={() => { currentController?.abort(); app.isLoading = false; app.activeRequests = {}; }}
        class="flex items-center gap-1.5 px-3 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs text-red-400 transition-colors"
        title={$t('tooltip_cancel')}>
        {$t('graph_cancel')}
      </button>
    {/if}
  </div>

  <!-- Graph -->
  <SvelteFlow
    proOptions={{ hideAttribution: true }}
    nodes={nodesStore}
    edges={edgesStore}
    {nodeTypes}
    fitView
    fitViewOptions={{ padding: 0.2 }}
    colorMode="dark"
    on:nodeclick={handleNodeClick}
  >
    <Controls />
    <MiniMap />
    <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
  </SvelteFlow>
</div>