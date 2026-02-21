/**
 * src/lib/i18n/index.ts
 *
 * Usage:
 *   import { t, locale, setLocale } from '$lib/i18n';
 *
 *   // In templates:
 *   {$t('landing_title')}
 *
 *   // Switch language:
 *   setLocale('ru');
 *
 * To add a new language:
 *   1. Create src/lib/i18n/de.ts implementing Translations
 *   2. Add 'de' to LocaleCode in types.ts
 *   3. Add it to the `locales` map below
 *   4. Add a flag/label in LocaleSwitcher.svelte
 */

import { derived, writable } from 'svelte/store';
import type { Translations, LocaleCode } from './types';
import { en } from './en';
import { ru } from './ru';

// ── Registry ──────────────────────────────────────────────────────────────────

const locales: Record<LocaleCode, Translations> = { en, ru };

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: '🇬🇧 EN',
  ru: '🇷🇺 RU',
};

// ── Detect initial locale ─────────────────────────────────────────────────────

function detectLocale(): LocaleCode {
  // 1. User explicitly saved a preference
  const saved = typeof localStorage !== 'undefined'
    ? localStorage.getItem('locale') as LocaleCode | null
    : null;
  if (saved && saved in locales) return saved;

  // 2. Browser language
  const browser = typeof navigator !== 'undefined'
    ? navigator.language.split('-')[0]
    : 'en';
  if (browser in locales) return browser as LocaleCode;

  return 'en';
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const locale = writable<LocaleCode>(detectLocale());

export function setLocale(code: LocaleCode) {
  locale.set(code);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('locale', code);
  }
}

/**
 * Reactive translation store.
 * Components subscribe via `$t('key')`.
 */
export const t = derived(
  locale,
  ($locale) => (key: keyof Translations): string => {
    return locales[$locale][key] ?? locales['en'][key] ?? key;
  }
);

/** One-shot translation outside Svelte reactive context (e.g. snackbar messages). */
export function translate(key: keyof Translations): string {
  let code: LocaleCode = 'en';
  locale.subscribe(v => { code = v; })(); // immediately unsubscribe
  return locales[code][key] ?? locales['en'][key] ?? key;
}

/**
 * Returns the current locale code synchronously.
 * Useful in api.ts to build locale-aware prompts.
 */
export function getLocale(): LocaleCode {
  let code: LocaleCode = 'en';
  locale.subscribe(v => { code = v; })();
  return code;
}