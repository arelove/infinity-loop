<script lang="ts">
  import { locale, setLocale, LOCALE_LABELS } from '$lib/i18n';
  import type { LocaleCode } from '$lib/i18n/types';

  const codes = Object.keys(LOCALE_LABELS) as LocaleCode[];

  function cycle() {
    const idx  = codes.indexOf($locale);
    const next = codes[(idx + 1) % codes.length];
    setLocale(next);
  }
</script>

<button
  onclick={cycle}
  class="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-[10px] text-white/50 hover:text-white font-medium tracking-wider"
  title="Switch language"
>
  {LOCALE_LABELS[$locale].split(' ')[1]}
</button>