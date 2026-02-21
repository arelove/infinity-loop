<script lang="ts">
  interface Props {
    current: string;
    onApply: (layoutId: string) => void;
  }
  let { current, onApply }: Props = $props();

  let open = $state(false);

  const LAYOUTS = [
    {
      id: 'tb',
      label: 'Top → Bottom',
      desc: 'Иерархия сверху вниз',
      icon: `<line x1="12" y1="4" x2="12" y2="20"/><polyline points="8 16 12 20 16 16"/><line x1="6" y1="8" x2="18" y2="8"/>`,
    },
    {
      id: 'lr',
      label: 'Left → Right',
      desc: 'Иерархия слева направо',
      icon: `<line x1="4" y1="12" x2="20" y2="12"/><polyline points="16 8 20 12 16 16"/><line x1="8" y1="6" x2="8" y2="18"/>`,
    },
    {
      id: 'bt',
      label: 'Bottom → Top',
      desc: 'Иерархия снизу вверх',
      icon: `<line x1="12" y1="20" x2="12" y2="4"/><polyline points="8 8 12 4 16 8"/><line x1="6" y1="16" x2="18" y2="16"/>`,
    },
    {
      id: 'rl',
      label: 'Right → Left',
      desc: 'Иерархия справа налево',
      icon: `<line x1="20" y1="12" x2="4" y2="12"/><polyline points="8 8 4 12 8 16"/><line x1="16" y1="6" x2="16" y2="18"/>`,
    },
    {
      id: 'radial',
      label: 'Radial',
      desc: 'Корень в центре, дети по кругу',
      icon: `<circle cx="12" cy="12" r="3"/><circle cx="12" cy="4" r="1.5"/><circle cx="19.2" cy="8" r="1.5"/><circle cx="19.2" cy="16" r="1.5"/><circle cx="12" cy="20" r="1.5"/><circle cx="4.8" cy="16" r="1.5"/><circle cx="4.8" cy="8" r="1.5"/><line x1="12" y1="9" x2="12" y2="5.5"/><line x1="12" y1="9" x2="18.2" y2="9"/><line x1="12" y1="15" x2="18.2" y2="15"/><line x1="12" y1="15" x2="12" y2="18.5"/><line x1="12" y1="15" x2="5.8" y2="15"/><line x1="12" y1="9" x2="5.8" y2="9"/>`,
    },
    {
      id: 'grid',
      label: 'Grid',
      desc: 'Равномерная сетка',
      icon: `<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="10" y="3" width="5" height="5" rx="1"/><rect x="17" y="3" width="5" height="5" rx="1"/><rect x="3" y="10" width="5" height="5" rx="1"/><rect x="10" y="10" width="5" height="5" rx="1"/><rect x="17" y="10" width="5" height="5" rx="1"/><rect x="3" y="17" width="5" height="5" rx="1"/><rect x="10" y="17" width="5" height="5" rx="1"/>`,
    },
    {
      id: 'force',
      label: 'Force',
      desc: 'Физическое расположение по связям',
      icon: `<circle cx="12" cy="12" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="4" r="1.5"/><line x1="12" y1="10" x2="6.4" y2="6.4"/><line x1="12" y1="10" x2="17.6" y2="6.4"/><line x1="12" y1="14" x2="6.4" y2="17.6"/><line x1="12" y1="14" x2="17.6" y2="17.6"/><line x1="12" y1="10" x2="12" y2="5.5"/>`,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      desc: 'Горизонтально по глубине дерева',
      icon: `<line x1="3" y1="12" x2="21" y2="12"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><line x1="6" y1="7" x2="6" y2="10"/><line x1="12" y1="7" x2="12" y2="10"/><line x1="18" y1="7" x2="18" y2="10"/><rect x="4" y="3" width="4" height="4" rx="1"/><rect x="10" y="3" width="4" height="4" rx="1"/><rect x="16" y="3" width="4" height="4" rx="1"/>`,
    },
  ] as const;

  type LayoutId = typeof LAYOUTS[number]['id'];

  const currentLayout = $derived(LAYOUTS.find(l => l.id === current) ?? LAYOUTS[0]);

  function select(id: string) {
    open = false;
    onApply(id);
  }
</script>

<div class="layout-picker">
  <button class="trigger" onclick={() => (open = !open)} title="Change layout">
    <!-- current icon -->
    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
      {@html currentLayout.icon}
    </svg>
    <span class="trigger-label">{currentLayout.label}</span>
    <svg class="chevron w-2.5 h-2.5" class:rotated={open} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
    </svg>
  </button>

  {#if open}
    <!-- backdrop -->
    <div class="backdrop" onclick={() => (open = false)} role="none"></div>

    <div class="menu">
      <p class="menu-title">LAYOUT</p>
      {#each LAYOUTS as layout}
        <button
          class="menu-item"
          class:active={layout.id === current}
          onclick={() => select(layout.id)}
        >
          <svg class="item-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            {@html layout.icon}
          </svg>
          <div class="item-text">
            <span class="item-label">{layout.label}</span>
            <span class="item-desc">{layout.desc}</span>
          </div>
          {#if layout.id === current}
            <svg class="check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .layout-picker {
    position: relative;
  }

  .trigger {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 11px;
    color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .trigger:hover {
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.75);
  }
  .trigger-label {
    font-size: 11px;
  }
  .chevron {
    transition: transform 0.2s;
    opacity: 0.5;
  }
  .chevron.rotated {
    transform: rotate(180deg);
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 19;
    background: transparent;
  }

  .menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 20;
    background: #171717;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(0,0,0,0.7);
    min-width: 220px;
    padding: 6px;
  }

  .menu-title {
    font-size: 9px;
    letter-spacing: 0.12em;
    color: rgba(255,255,255,0.2);
    padding: 6px 10px 4px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s;
  }
  .menu-item:hover {
    background: rgba(255,255,255,0.06);
  }
  .menu-item.active {
    background: rgba(99,179,237,0.1);
  }

  .item-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    color: rgba(255,255,255,0.35);
  }
  .menu-item.active .item-icon {
    color: rgba(99,179,237,0.8);
  }

  .item-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .item-label {
    font-size: 11px;
    font-weight: 500;
    color: rgba(255,255,255,0.6);
  }
  .menu-item.active .item-label {
    color: rgba(147,210,255,0.9);
  }
  .item-desc {
    font-size: 9px;
    color: rgba(255,255,255,0.22);
  }

  .check {
    width: 12px;
    height: 12px;
    color: rgba(99,179,237,0.8);
    flex-shrink: 0;
  }
</style>