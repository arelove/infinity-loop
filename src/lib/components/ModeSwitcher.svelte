<script lang="ts">
  interface Props {
    mode: 'seek' | 'dev';
    onToggle: () => void;
  }
  let { mode, onToggle }: Props = $props();
</script>

<button
  onclick={onToggle}
  class="mode-btn"
  class:is-dev={mode === 'dev'}
  title={mode === 'seek' ? 'Switch to DEV mode' : 'Switch to SEEK mode'}
>
  <span class="mode-label seek-label">SEEK</span>
  <span class="mode-label dev-label">DEV</span>

  <!-- Sliding pill -->
  <span class="pill" class:pill-right={mode === 'dev'}></span>
</button>

<style>
  .mode-btn {
    position: relative;
    display: flex;
    align-items: center;
    width: 88px;
    height: 28px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 999px;
    padding: 3px;
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.3s;
  }
  .mode-btn:hover {
    border-color: rgba(255,255,255,0.2);
  }
  .mode-btn.is-dev {
    border-color: rgba(99,179,237,0.3);
  }

  .mode-label {
    position: absolute;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    transition: color 0.3s, opacity 0.3s;
    pointer-events: none;
    z-index: 2;
  }
  .seek-label {
    left: 10px;
    color: rgba(255,255,255,0.5);
  }
  .dev-label {
    right: 10px;
    color: rgba(255,255,255,0.25);
  }
  /* Active label styles */
  .mode-btn:not(.is-dev) .seek-label { color: rgba(255,255,255,0.9); }
  .mode-btn:not(.is-dev) .dev-label  { color: rgba(255,255,255,0.25); }
  .mode-btn.is-dev .seek-label { color: rgba(255,255,255,0.25); }
  .mode-btn.is-dev .dev-label  { color: rgb(96,165,250); }

  /* Sliding pill indicator */
  .pill {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 38px;
    height: 20px;
    border-radius: 999px;
    background: rgba(255,255,255,0.1);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s;
    z-index: 1;
  }
  .pill.pill-right {
    transform: translateX(42px);
    background: rgba(96,165,250,0.2);
  }
</style>
