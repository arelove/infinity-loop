<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { setConfig } from '$lib/api';

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

{@render children()}