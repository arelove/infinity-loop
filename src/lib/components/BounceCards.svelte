<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';

  interface Props {
    images: string[];
    maxCards?: number;
  }

  let { images, maxCards = 5 }: Props = $props();

  const transforms = [
    'rotate(-15deg) translate(-170px, -30px)',
    'rotate(-5deg)  translate(-85px,  -15px)',
    'rotate(0deg)',
    'rotate(5deg)   translate(85px,   -15px)',
    'rotate(15deg)  translate(170px,  -30px)',
  ];

  let cardEls: HTMLElement[] = [];
  let validImages = $state<string[]>([]);
  let selectedImg = $state<string | null>(null);

  $effect(() => {
    validImages = images.slice(0, maxCards);
  });

  onMount(() => {
    // Bounce-in animation
    cardEls.forEach((el, i) => {
      if (!el) return;
      gsap.fromTo(el,
        { scale: 0, opacity: 0, y: 40 },
        { scale: 1, opacity: 1, y: 0, duration: 0.6, delay: 0.1 + i * 0.08, ease: 'elastic.out(1, 0.7)' }
      );
    });
  });

  function onEnter(el: HTMLElement) {
    gsap.to(el, { scale: 1.12, zIndex: 10, duration: 0.25, ease: 'power2.out' });
  }
  function onLeave(el: HTMLElement) {
    gsap.to(el, { scale: 1, zIndex: 1, duration: 0.25, ease: 'power2.out' });
  }
  function onError(src: string) {
    validImages = validImages.filter(u => u !== src);
  }
</script>

<!-- Cards strip -->
<div class="relative flex items-center justify-center" style="height:90px; width:100%;">
  {#each validImages as src, i}
    <div
      bind:this={cardEls[i]}
      class="absolute w-[80px] h-[80px] rounded-xl overflow-hidden border border-white/20 shadow-lg cursor-pointer"
      style="transform:{transforms[i] ?? 'none'}; z-index:1;"
      onmouseenter={(e) => onEnter(e.currentTarget as HTMLElement)}
      onmouseleave={(e) => onLeave(e.currentTarget as HTMLElement)}
      onclick={() => (selectedImg = src)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectedImg = src; }}
      role="button"
      tabindex={i}
    >
      <img
        {src}
        alt="result-{i}"
        class="w-full h-full object-cover"
        onerror={() => onError(src)}
        loading="lazy"
      />
    </div>
  {/each}
</div>

<!-- Lightbox -->
{#if selectedImg}
  <div
    class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm"
    onclick={() => (selectedImg = null)}
    onkeydown={(e) => { if (e.key === 'Escape') selectedImg = null; }}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <img
      src={selectedImg}
      alt="preview"
      class="max-w-[88vw] max-h-[88vh] rounded-xl object-contain shadow-2xl"
    />
    <button
      class="absolute top-5 right-5 text-white/70 hover:text-white bg-black/50 rounded-full p-2"
      onclick={() => (selectedImg = null)}
      aria-label="Close preview"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  </div>
{/if}