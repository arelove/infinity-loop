<script lang="ts" module>
  // Shared singleton state accessible from outside
  export type SnackbarType = 'error' | 'success' | 'info';

  interface SnackbarItem {
    id: number;
    message: string;
    type: SnackbarType;
    timer: ReturnType<typeof setTimeout>;
  }

  let items = $state<SnackbarItem[]>([]);
  let counter = 0;

  export function showSnackbar(message: string, type: SnackbarType = 'error', duration = 4500) {
    const id = ++counter;
    const timer = setTimeout(() => dismiss(id), duration);
    items = [...items, { id, message, type, timer }];
  }

  function dismiss(id: number) {
    const item = items.find(i => i.id === id);
    if (item) clearTimeout(item.timer);
    items = items.filter(i => i.id !== id);
  }
</script>

<script lang="ts">
  const icons: Record<SnackbarType, string> = {
    error:   'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
    success: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    info:    'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
  };

  const colors: Record<SnackbarType, string> = {
    error:   'bg-red-950/90 border-red-500/30 text-red-200',
    success: 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200',
    info:    'bg-blue-950/90 border-blue-500/30 text-blue-200',
  };

  const iconColors: Record<SnackbarType, string> = {
    error:   'text-red-400',
    success: 'text-emerald-400',
    info:    'text-blue-400',
  };
</script>

<div class="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none" style="max-width: 390px;">
  {#each items as item (item.id)}
    <div
      class="snack-enter pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl text-sm leading-snug {colors[item.type]}"
    >
      <svg class="w-5 h-5 mt-0.5 flex-shrink-0 {iconColors[item.type]}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.7">
        <path stroke-linecap="round" stroke-linejoin="round" d={icons[item.type]}/>
      </svg>
      <span class="flex-1">{item.message}</span>
      <button
        onclick={() => dismiss(item.id)}
        class="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity ml-1 mt-0.5"
        aria-label="Dismiss"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  {/each}
</div>

<style>
  .snack-enter {
    animation: snackIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes snackIn {
    from { opacity: 0; transform: translateX(24px) scale(0.93); }
    to   { opacity: 1; transform: translateX(0)    scale(1); }
  }
</style>