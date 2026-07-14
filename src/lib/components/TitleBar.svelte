<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { onMount } from 'svelte';

  const appWindow = getCurrentWindow();
  let maximized = $state(false);

  async function refresh() {
    try { maximized = await appWindow.isMaximized(); } catch { /* non-Tauri context */ }
  }

  onMount(() => {
    refresh();
    // Keep the maximize/restore icon in sync with the real window state.
    const unlisten = appWindow.onResized(() => refresh());
    return () => { unlisten.then((f) => f()).catch(() => {}); };
  });

  const minimize   = () => appWindow.minimize();
  const toggleMax  = () => appWindow.toggleMaximize();
  const closeWin   = () => appWindow.close();
</script>

<!-- data-tauri-drag-region makes the empty areas draggable and double-click-to-maximize -->
<div class="titlebar" data-tauri-drag-region>
  <div class="tb-title" data-tauri-drag-region>Infinity Loop</div>

  <div class="tb-controls">
    <button class="tb-btn" onclick={minimize} aria-label="Minimize" title="Minimize">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
      </svg>
    </button>

    <button class="tb-btn" onclick={toggleMax} aria-label="Maximize" title={maximized ? 'Restore' : 'Maximize'}>
      {#if maximized}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect x="0.5" y="2.5" width="6" height="6" fill="none" stroke="currentColor" stroke-width="1" />
          <path d="M2.5 2.5 V0.5 H9.5 V7.5 H7.5" fill="none" stroke="currentColor" stroke-width="1" />
        </svg>
      {:else}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1" />
        </svg>
      {/if}
    </button>

    <button class="tb-btn tb-close" onclick={closeWin} aria-label="Close" title="Close">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M0.5 0.5 L9.5 9.5 M9.5 0.5 L0.5 9.5" stroke="currentColor" stroke-width="1.1" />
      </svg>
    </button>
  </div>
</div>

<style>
  .titlebar {
    height: 34px;
    flex: 0 0 34px;
    position: relative; /* required for z-index to lift the bar above modals */
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #141414;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    user-select: none;
    -webkit-user-select: none;
    z-index: 1000;
  }

  .tb-title {
    padding-left: 14px;
    font-size: 12px;
    letter-spacing: 0.02em;
    color: rgba(255, 255, 255, 0.55);
    pointer-events: none; /* let clicks fall through to the drag region */
  }

  .tb-controls {
    display: flex;
    height: 100%;
  }

  .tb-btn {
    width: 46px;
    height: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.6);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background-color 0.12s, color 0.12s;
  }

  .tb-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.95);
  }

  .tb-close:hover {
    background: #e11d48;
    color: #fff;
  }
</style>
