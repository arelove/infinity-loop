<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { gsap } from 'gsap';
  import { t } from '$lib/i18n';
  import { app, handleSearch, handleImportJSON, deckClick, type DeckKey } from '../_shared/appState.svelte';
  import OldLanding from './LandingOld.svelte';

  let thothEl  = $state<HTMLButtonElement | null>(null);
  let anubisEl = $state<HTMLButtonElement | null>(null);
  let isisEl   = $state<HTMLButtonElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let logoEl   = $state<HTMLDivElement | null>(null);
  let contentEl = $state<HTMLDivElement | null>(null);
  let highGraphics = $state(false);

  // ── Star field ────────────────────────────────────────────────────────────
  function initStars(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!;
    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const STAR_COUNT = 280;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.4 + 0.2,
      speed: Math.random() * 0.15 + 0.03,
      opacity: Math.random() * 0.7 + 0.1,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    // Shooting stars
    const shoots: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];
    function spawnShoot() {
      const edge = Math.random();
      let x = 0, y = 0;
      if (edge < 0.5) { x = Math.random() * W; y = 0; }
      else { x = 0; y = Math.random() * H * 0.5; }
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.5;
      shoots.push({ x, y, vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8, life: 0, maxLife: 40 + Math.random() * 30 });
    }

    let frame = 0;
    let raf: number;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Deep space gradient background
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.5, W * 0.8);
      bg.addColorStop(0,   'rgba(8,4,20,0)');
      bg.addColorStop(0.4, 'rgba(4,2,14,0.3)');
      bg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Nebula blobs
      [
        { cx: W * 0.2, cy: H * 0.3, r: 300, color: 'rgba(60,20,100,0.06)' },
        { cx: W * 0.8, cy: H * 0.6, r: 250, color: 'rgba(20,50,100,0.05)' },
        { cx: W * 0.5, cy: H * 0.7, r: 400, color: 'rgba(80,10,60,0.04)' },
      ].forEach(n => {
        const g = ctx.createRadialGradient(n.cx, n.cy, 0, n.cx, n.cy, n.r);
        g.addColorStop(0, n.color);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });

      // Stars
      frame++;
      stars.forEach(s => {
        s.twinklePhase += s.twinkleSpeed;
        const tw = 0.5 + 0.5 * Math.sin(s.twinklePhase);
        const op = s.opacity * (0.5 + 0.5 * tw);

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);

        // Bright stars get a glow
        if (s.r > 1.0) {
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
          glow.addColorStop(0, `rgba(200,180,255,${op * 0.8})`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        }

        ctx.fillStyle = `rgba(220,210,255,${op})`;
        ctx.fill();

        // Drift slowly
        s.y += s.speed * 0.1;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
      });

      // Shooting stars
      if (frame % 180 === 0 && Math.random() > 0.4) spawnShoot();
      for (let i = shoots.length - 1; i >= 0; i--) {
        const s = shoots[i];
        s.life++;
        const progress = s.life / s.maxLife;
        const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
        ctx.strokeStyle = `rgba(220,210,255,${alpha * 0.9})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(180,150,255,0.8)';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 8, s.y - s.vy * 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
        s.x += s.vx; s.y += s.vy;
        if (s.life >= s.maxLife) shoots.splice(i, 1);
      }

      raf = requestAnimationFrame(draw);
    }

    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }

  // ── Logo pulse animation ──────────────────────────────────────────────────
  function initLogo(el: HTMLDivElement) {
    // Entrance
    gsap.fromTo(el,
      { opacity: 0, y: -30, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 1.8, ease: 'power3.out', delay: 0.3 }
    );
    // Breathing glow
    gsap.to(el.querySelector('.logo-glow'), {
      opacity: 0.6,
      scale: 1.15,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
    // Subtle float
    gsap.to(el, {
      y: -8,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }

  // ── Content entrance ──────────────────────────────────────────────────────
  function initContent(el: HTMLDivElement) {
    const children = el.querySelectorAll('.anim-in');
    gsap.fromTo(children,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power2.out', delay: 0.7 }
    );
  }

  // ── Card hover animations ─────────────────────────────────────────────────
  function hoverAnim(el: HTMLElement) {
    let tl: gsap.core.Timeline | null = null;
    const on  = () => {
      tl?.kill();
      tl = gsap.timeline({ repeat: -1, yoyo: true })
        .to(el, { y: -14, rotate: 2, duration: 2.2, ease: 'power1.inOut' })
        .to(el, { y: -7, rotate: -1.5, duration: 2.2, ease: 'power1.inOut' });
    };
    const off = () => { tl?.kill(); gsap.to(el, { y: 0, rotate: 0, duration: 0.5, ease: 'power2.out' }); };
    el.addEventListener('mouseenter', on);
    el.addEventListener('mouseleave', off);
    return () => { el.removeEventListener('mouseenter', on); el.removeEventListener('mouseleave', off); };
  }

  onMount(() => {
    highGraphics = localStorage.getItem('high_graphics') === 'true';

    const cleanups: (() => void)[] = [];

    tick().then(() => {
        if (canvasEl)  cleanups.push(initStars(canvasEl));
        if (logoEl)    initLogo(logoEl);
        if (contentEl) initContent(contentEl);
        if (thothEl)   cleanups.push(hoverAnim(thothEl));
        if (anubisEl)  cleanups.push(hoverAnim(anubisEl));
        if (isisEl)    cleanups.push(hoverAnim(isisEl));
    });

    return () => cleanups.forEach(f => f());
    });
</script>

{#if highGraphics}
<!-- ── Root ─────────────────────────────────────────────────────────────── -->
<div class="landing-root">

  <!-- Star canvas -->
  <canvas bind:this={canvasEl} class="stars-canvas" />

  <!-- Vignette -->
  <div class="vignette" />

  <!-- Central glow orb -->
  <div class="orb" />

  <!-- Content wrapper -->
  <div class="content" bind:this={contentEl}>

    <!-- ── Logo ──────────────────────────────────────────────────────────── -->
    <div class="logo-wrap" bind:this={logoEl}>
      <div class="logo-glow" />
      <div class="logo-eye">
        <!-- Animated eye of Ra / ankh symbol -->
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
          <!-- Outer ring -->
          <circle cx="40" cy="40" r="36" stroke="url(#ring-grad)" stroke-width="0.8" class="svg-ring" />
          <!-- Inner ring -->
          <circle cx="40" cy="40" r="26" stroke="rgba(180,140,255,0.2)" stroke-width="0.5" />
          <!-- Eye shape -->
          <path d="M14 40 Q40 18 66 40 Q40 62 14 40Z" stroke="url(#eye-grad)" stroke-width="1" fill="none" />
          <!-- Pupil -->
          <circle cx="40" cy="40" r="7" fill="url(#pupil-grad)" class="svg-pupil" />
          <!-- Pupil inner -->
          <circle cx="40" cy="40" r="3" fill="rgba(255,200,100,0.9)" />
          <!-- Tick marks -->
          {#each Array(12) as _, i}
            {@const angle = (i * 30) * Math.PI / 180}
            {@const x1 = 40 + 34 * Math.cos(angle)}
            {@const y1 = 40 + 34 * Math.sin(angle)}
            {@const x2 = 40 + (i % 3 === 0 ? 28 : 31) * Math.cos(angle)}
            {@const y2 = 40 + (i % 3 === 0 ? 28 : 31) * Math.sin(angle)}
            <line {x1} {y1} {x2} {y2} stroke="rgba(180,140,255,{i % 3 === 0 ? '0.5' : '0.2'})" stroke-width="{i % 3 === 0 ? '1' : '0.5'}" />
          {/each}
          <defs>
            <linearGradient id="ring-grad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="rgba(160,100,255,0.6)" />
              <stop offset="50%" stop-color="rgba(100,180,255,0.4)" />
              <stop offset="100%" stop-color="rgba(160,100,255,0.6)" />
            </linearGradient>
            <linearGradient id="eye-grad" x1="14" y1="40" x2="66" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="rgba(140,80,255,0.5)" />
              <stop offset="50%" stop-color="rgba(200,160,255,0.9)" />
              <stop offset="100%" stop-color="rgba(140,80,255,0.5)" />
            </linearGradient>
            <radialGradient id="pupil-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(255,200,100,0.9)" />
              <stop offset="100%" stop-color="rgba(180,80,255,0.6)" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>

    <!-- ── Title ──────────────────────────────────────────────────────────── -->
    <div class="anim-in title-wrap">
      <h1 class="title">{$t('landing_title')}</h1>
      <p class="subtitle">{$t('landing_subtitle')}</p>
    </div>

    <!-- ── Divider ────────────────────────────────────────────────────────── -->
    <div class="anim-in divider-wrap">
      <div class="divider-line" />
      <span class="divider-glyph">✦</span>
      <div class="divider-line" />
    </div>

    <!-- ── Cards ─────────────────────────────────────────────────────────── -->
    <div class="anim-in cards-row">
      <!-- Thoth -->
      <button bind:this={thothEl} onclick={() => deckClick('thoth')} class="card-btn" title={$t('hint_deck')} type="button">
        <div class="card">
          <div class="card-bg card-bg-thoth" />
          <div class="card-border" />
          <div class="card-front">
            <span class="card-glyph">⊕</span>
            <span class="card-label">{$t('deck_thoth')}</span>
          </div>
          <div class="card-hover">
            <div class="card-hover-title">{$t('deck_thoth')}</div>
            <div class="card-hover-text">{app.deckQ.thoth}</div>
          </div>
        </div>
      </button>

      <!-- Anubis (taller / center) -->
      <button bind:this={anubisEl} onclick={() => deckClick('anubis')} class="card-btn card-center" title={$t('hint_deck')} type="button">
        <div class="card card-tall">
          <div class="card-bg card-bg-anubis" />
          <div class="card-border" />
          <div class="card-front">
            <span class="card-glyph">⊗</span>
            <span class="card-label">{$t('deck_anubis')}</span>
          </div>
          <div class="card-hover">
            <div class="card-hover-title">{$t('deck_anubis')}</div>
            <div class="card-hover-text">{app.deckQ.anubis}</div>
          </div>
        </div>
      </button>

      <!-- Isis -->
      <button bind:this={isisEl} onclick={() => deckClick('isis')} class="card-btn" title={$t('hint_deck')} type="button">
        <div class="card">
          <div class="card-bg card-bg-isis" />
          <div class="card-border" />
          <div class="card-front">
            <span class="card-glyph">⊙</span>
            <span class="card-label">{$t('deck_isis')}</span>
          </div>
          <div class="card-hover">
            <div class="card-hover-title">{$t('deck_isis')}</div>
            <div class="card-hover-text">{app.deckQ.isis}</div>
          </div>
        </div>
      </button>
    </div>

    <!-- ── Search ─────────────────────────────────────────────────────────── -->
    <div class="anim-in search-wrap">
      <div class="search-box" class:loading={app.isLoading}>
        <input
          type="text"
          class="search-input"
          bind:value={app.query}
          onkeydown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={$t('landing_placeholder')}
          disabled={app.isLoading}
        />
        {#if app.isLoading}
          <div class="search-spinner">
            <div class="spinner" />
          </div>
        {:else}
          <button onclick={handleSearch} class="search-btn" title={$t('hint_search')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="search-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
        {/if}
      </div>
    </div>

    <!-- ── Import ─────────────────────────────────────────────────────────── -->
    <div class="anim-in">
      <button onclick={handleImportJSON} class="import-btn">
        ↑ {$t('landing_load_session')}
      </button>
    </div>

  </div>
</div>
{:else}
    <OldLanding />
{/if}

<style>
  /* ── Root ──────────────────────────────────────────────────────────────── */
  .landing-root {
    position: relative;
    width: 100%;
    min-height: 100vh;
    background: #03010a;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  /* ── Stars canvas ──────────────────────────────────────────────────────── */
  .stars-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  /* ── Vignette ──────────────────────────────────────────────────────────── */
  .vignette {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(3,1,10,0.7) 100%);
    pointer-events: none;
  }

  /* ── Central orb ──────────────────────────────────────────────────────── */
  .orb {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle,
      rgba(100,40,200,0.07) 0%,
      rgba(60,20,140,0.04) 40%,
      transparent 70%
    );
    pointer-events: none;
    animation: orbPulse 8s ease-in-out infinite;
  }
  @keyframes orbPulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
    50%       { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
  }

  /* ── Content ───────────────────────────────────────────────────────────── */
  .content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    padding: 40px 20px;
    user-select: none;
  }

  /* ── Logo ──────────────────────────────────────────────────────────────── */
  .logo-wrap {
    position: relative;
    width: 100px;
    height: 100px;
    margin-bottom: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo-glow {
    position: absolute;
    inset: -30px;
    border-radius: 50%;
    background: radial-gradient(circle,
      rgba(140,60,255,0.35) 0%,
      rgba(80,30,200,0.15) 50%,
      transparent 70%
    );
    opacity: 0.4;
    animation: glowPulse 3s ease-in-out infinite;
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50%       { opacity: 0.7; transform: scale(1.12); }
  }
  .logo-eye {
    position: relative;
    width: 80px;
    height: 80px;
  }
  .logo-svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 12px rgba(140,60,255,0.6));
  }
  .svg-ring {
    animation: rotateSlow 20s linear infinite;
    transform-origin: 40px 40px;
  }
  @keyframes rotateSlow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .svg-pupil {
    animation: pupilGlow 2.5s ease-in-out infinite;
  }
  @keyframes pupilGlow {
    0%, 100% { opacity: 0.8; }
    50%       { opacity: 1; filter: brightness(1.3); }
  }

  /* ── Title ─────────────────────────────────────────────────────────────── */
  .title-wrap {
    text-align: center;
    margin-bottom: 20px;
  }
  .title {
    font-family: 'Cinzel', 'Trajan Pro', serif;
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 400;
    letter-spacing: 0.2em;
    color: transparent;
    background: linear-gradient(135deg,
      rgba(200,160,255,0.95) 0%,
      rgba(255,240,200,0.9) 40%,
      rgba(180,120,255,0.85) 100%
    );
    background-clip: text;
    -webkit-background-clip: text;
    text-shadow: none;
    margin: 0;
    filter: drop-shadow(0 0 20px rgba(140,60,255,0.4));
  }
  .subtitle {
    font-family: 'Cinzel', serif;
    font-size: 0.62rem;
    letter-spacing: 0.45em;
    color: rgba(180,140,255,0.35);
    margin: 8px 0 0;
    text-transform: uppercase;
  }

  /* ── Divider ───────────────────────────────────────────────────────────── */
  .divider-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 300px;
    margin-bottom: 36px;
  }
  .divider-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(140,80,255,0.3), transparent);
  }
  .divider-glyph {
    color: rgba(140,80,255,0.4);
    font-size: 10px;
    animation: glyphSpin 6s linear infinite;
  }
  @keyframes glyphSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* ── Cards ─────────────────────────────────────────────────────────────── */
  .cards-row {
    display: flex;
    gap: 20px;
    align-items: flex-end;
    margin-bottom: 44px;
  }
  .card-btn {
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    width: 130px;
  }
  .card-center {
    margin-bottom: -16px;
  }
  .card {
    position: relative;
    width: 100%;
    aspect-ratio: 2/3;
    border-radius: 14px;
    overflow: hidden;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  .card-tall {
    aspect-ratio: 2/3.3;
  }
  .card-btn:hover .card {
    box-shadow:
      0 0 30px rgba(140,60,255,0.2),
      0 20px 60px rgba(0,0,0,0.6);
  }

  .card-bg {
    position: absolute;
    inset: 0;
  }
  .card-bg-thoth {
    background: linear-gradient(160deg, #0e0520 0%, #1a0840 50%, #0a0318 100%);
  }
  .card-bg-anubis {
    background: linear-gradient(160deg, #08040e 0%, #1a0818 50%, #0a0310 100%);
  }
  .card-bg-isis {
    background: linear-gradient(160deg, #050a1a 0%, #0c1840 50%, #040816 100%);
  }
  .card-border {
    position: absolute;
    inset: 0;
    border-radius: 14px;
    border: 1px solid rgba(140,80,255,0.15);
    transition: border-color 0.3s;
  }
  .card-btn:hover .card-border {
    border-color: rgba(180,120,255,0.4);
  }

  .card-front {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: opacity 0.3s;
  }
  .card-btn:hover .card-front { opacity: 0; }

  .card-glyph {
    font-size: 2.2rem;
    color: rgba(160,100,255,0.4);
    font-family: serif;
    filter: drop-shadow(0 0 8px rgba(140,60,255,0.3));
    animation: glyphPulse 3s ease-in-out infinite;
  }
  @keyframes glyphPulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.7; filter: drop-shadow(0 0 12px rgba(140,60,255,0.6)); }
  }
  .card-label {
    font-family: 'Cinzel', serif;
    font-size: 0.55rem;
    letter-spacing: 0.2em;
    color: rgba(180,140,255,0.3);
    text-transform: uppercase;
  }

  .card-hover {
    position: absolute;
    inset: 0;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.3s;
    background: rgba(10,4,24,0.92);
  }
  .card-btn:hover .card-hover { opacity: 1; }
  .card-hover-title {
    font-family: 'Cinzel', serif;
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    color: rgba(180,130,255,0.7);
    text-transform: uppercase;
  }
  .card-hover-text {
    font-size: 0.7rem;
    color: rgba(200,180,255,0.45);
    font-style: italic;
    line-height: 1.6;
  }

  /* ── Search ─────────────────────────────────────────────────────────────── */
  .search-wrap {
    width: 100%;
    max-width: 480px;
    margin-bottom: 20px;
  }
  .search-box {
    position: relative;
    display: flex;
    align-items: center;
    background: rgba(10,4,24,0.7);
    border: 1px solid rgba(120,70,220,0.2);
    border-radius: 999px;
    backdrop-filter: blur(12px);
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .search-box:focus-within {
    border-color: rgba(160,90,255,0.45);
    box-shadow: 0 0 24px rgba(120,60,220,0.15), inset 0 0 12px rgba(100,40,200,0.05);
  }
  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    padding: 14px 20px;
    font-size: 0.875rem;
    color: rgba(220,200,255,0.9);
    font-weight: 300;
    letter-spacing: 0.05em;
    font-family: inherit;
  }
  .search-input::placeholder {
    color: rgba(160,120,255,0.25);
  }
  .search-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 10px 14px;
    border-radius: 999px;
    transition: background 0.2s;
    display: flex;
    align-items: center;
  }
  .search-btn:hover { background: rgba(140,60,255,0.1); }
  .search-icon {
    width: 18px;
    height: 18px;
    color: rgba(160,110,255,0.5);
    transition: color 0.2s;
  }
  .search-btn:hover .search-icon { color: rgba(200,160,255,0.8); }
  .search-spinner {
    padding: 10px 14px;
    display: flex;
    align-items: center;
  }
  .spinner {
    width: 18px; height: 18px;
    border: 1.5px solid rgba(140,60,255,0.2);
    border-top-color: rgba(180,100,255,0.8);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Import ─────────────────────────────────────────────────────────────── */
  .import-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.6rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: rgba(140,90,255,0.2);
    transition: color 0.3s;
    font-family: 'Cinzel', serif;
    padding: 4px 8px;
  }
  .import-btn:hover { color: rgba(180,130,255,0.5); }
</style>