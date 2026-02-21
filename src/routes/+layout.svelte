<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { saveApiKeys } from '$lib/api';

  let { children } = $props();

  onMount(async () => {
    const tavily = localStorage.getItem('tavily_key') ?? '';
    const gemini = localStorage.getItem('gemini_key') ?? '';
    if (tavily || gemini) {
      try { await saveApiKeys(tavily, gemini); }
      catch (e) { console.warn('[Keys] restore failed:', e); }
    }
  });
</script>

{@render children()}