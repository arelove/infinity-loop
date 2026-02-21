import { writable } from 'svelte/store';

export type SnackType = 'success' | 'error' | 'info';

export interface SnackItem {
  id: number;
  message: string;
  type: SnackType;
}

let _id = 0;

function createSnackStore() {
  const { subscribe, update } = writable<SnackItem[]>([]);

  function show(message: string, type: SnackType = 'info', duration = 3500) {
    const id = ++_id;
    update(items => [...items, { id, message, type }]);
    setTimeout(() => {
      update(items => items.filter(i => i.id !== id));
    }, duration);
  }

  return {
    subscribe,
    success: (msg: string) => show(msg, 'success'),
    error:   (msg: string) => show(msg, 'error', 5000),
    info:    (msg: string) => show(msg, 'info'),
  };
}

export const snack = createSnackStore();