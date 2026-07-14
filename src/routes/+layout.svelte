<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { setConfig } from '$lib/api';
  import TitleBar from '$lib/components/TitleBar.svelte';

  let { children } = $props();

  // One-time migration: earlier versions stored keys in localStorage on the
  // frontend. Move them into the Rust backend and wipe them from the frontend.
  onMount(async () => {
    const tavily = localStorage.getItem('tavily_key');
    const gemini = localStorage.getItem('gemini_key');
    if (tavily || gemini) {
      try {
        await setConfig({ tavily_key: tavily ?? '', gemini_key: gemini ?? '' });
        localStorage.removeItem('tavily_key');
        localStorage.removeItem('gemini_key');
      } catch (e) { console.warn('[Keys] migration failed:', e); }
    }
  });
</script>

<div class="app-shell">
  <TitleBar />
  <div class="app-content">
    {@render children()}
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    background: #1a1a1a;
  }
  .app-content {
    flex: 1 1 auto;
    position: relative;
    overflow: hidden;
    min-height: 0;
  }
</style>