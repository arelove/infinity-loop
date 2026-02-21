<script lang="ts">
  import { onMount } from 'svelte';
  import Snackbar      from '$lib/components/Snackbar.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import GraphGallery  from '$lib/components/GraphGallery.svelte';
  import SeekFace      from './_seek/SeekFace.svelte';
  import DevFace       from './_dev/DevFace.svelte';
  import {
    app,
    handleLoadSession, handleImportJSON,
    handleSaveGraph, handleExportPNG, resetToSearch,
    currentController,
  } from './_shared/appState.svelte';

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  onMount(() => {
    function onKey(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') {
        if (app.showSettings) { app.showSettings = false; return; }
        if (app.showGallery)  { app.showGallery  = false; return; }
      }
      if (ctrl && e.key === 'r' && !app.showSearch) { e.preventDefault(); resetToSearch(); }
      if (ctrl && e.key === 's' && !app.showSearch) { e.preventDefault(); handleSaveGraph(); }
      if (ctrl && e.key === 'e' && !app.showSearch) { e.preventDefault(); handleExportPNG(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

<!-- Global snackbar -->
<Snackbar />

<!-- Shared modals -->
<SettingsModal open={app.showSettings} onclose={() => (app.showSettings = false)} />
<GraphGallery
  open={app.showGallery}
  onclose={() => (app.showGallery = false)}
  onload={handleLoadSession}
  onimport={handleImportJSON}
/>

<!-- 3-D flip scene -->
<div class="scene">
  <div class="flipper" class:flipped={app.appMode === 'dev'}>
    <SeekFace />
    <DevFace />
  </div>
</div>

<style>
  .scene {
    width: 100vw;
    height: 100vh;
    perspective: 1800px;
    background: #1a1a1a;
  }
  .flipper {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.7s cubic-bezier(0.77, 0, 0.18, 1);
    background: #1a1a1a;
  }
  .flipper.flipped {
    transform: rotateY(180deg);
  }
  :global(.face) {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
  }
  :global(.face-front) { transform: rotateY(0deg); }
  :global(.face-back)  { transform: rotateY(180deg); }
</style>