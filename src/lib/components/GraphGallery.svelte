<script lang="ts">
  import { listSessions, loadSession, deleteSession, formatDate, type SessionMeta, type SavedSession } from '$lib/SessionStore';
  import { t } from '$lib/i18n';

  interface Props { open: boolean; onclose: () => void; onload: (s: SavedSession) => void; onimport: () => void; }
  let { open, onclose, onload, onimport }: Props = $props();

  let sessions   = $state<SessionMeta[]>([]);
  let fetching   = $state(false);
  let err        = $state('');
  let deletingId = $state<string | null>(null);
  let activeTab  = $state<'ai' | 'dev'>('ai');

  $effect(() => { if (open) refresh(); });

  async function refresh() {
    fetching = true; err = '';
    try { sessions = await listSessions(); }
    catch (e) { err = String(e); }
    finally { fetching = false; }
  }

  // Split sessions by type: dev sessions have id starting with "dev_" OR _type === 'dev'
  const aiSessions  = $derived(sessions.filter(s => !s.session_type || s.session_type === 'ai'));
  const devSessions = $derived(sessions.filter(s => s.session_type === 'dev'));
  const visibleSessions = $derived(activeTab === 'ai' ? aiSessions : devSessions);

  async function handleLoad(meta: SessionMeta) {
    try { onload(await loadSession(meta.id)); onclose(); }
    catch (e) { err = `${$t('gallery_error_load')}: ${e}`; }
  }

  async function handleDelete(id: string) {
    deletingId = id;
    try { await deleteSession(id); sessions = sessions.filter(s => s.id !== id); }
    catch (e) { err = `${$t('gallery_error_delete')}: ${e}`; }
    finally { deletingId = null; }
  }

  async function handleExportJSON(meta: SessionMeta) {
    try {
      const session = await loadSession(meta.id);
      const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `rabbithole-${meta.title.slice(0, 30).replace(/\W+/g, '-')}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { err = `${$t('gallery_error_export')}: ${e}`; }
  }

  function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onclose(); }
</script>

{#if open}
  <div 
    class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    onclick={onclose}
    onkeydown={handleKey}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
  <div class="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col" style="max-height:80vh;" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="none">

    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
      <div>
        <h2 class="text-sm font-semibold text-white tracking-wide">{$t('gallery_title')}</h2>
        <p class="text-[10px] text-white/25 mt-0.5 tracking-wide">{$t('gallery_description')}</p>
      </div>
      <div class="flex items-center gap-2">
        <button onclick={() => { onclose(); onimport(); }} class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-white/40 hover:text-white transition-colors tracking-widest uppercase">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          {$t('gallery_import')}
        </button>
        <button onclick={onclose} class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-colors text-xl leading-none">×</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-white/8 flex-shrink-0 px-6">
      <button
        onclick={() => (activeTab = 'ai')}
        class="flex items-center gap-2 py-3 pr-6 text-[11px] tracking-widest uppercase transition-colors border-b-2 {activeTab === 'ai' ? 'border-white/60 text-white' : 'border-transparent text-white/30 hover:text-white/60'}"
      >
        <!-- AI icon -->
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        {$t('gallery_tab_ai')}
        <span class="px-1.5 py-0.5 rounded bg-white/8 text-[9px] text-white/40">{aiSessions.length}</span>
      </button>
      <button
        onclick={() => (activeTab = 'dev')}
        class="flex items-center gap-2 py-3 pr-6 text-[11px] tracking-widest uppercase transition-colors border-b-2 {activeTab === 'dev' ? 'border-purple-400/80 text-purple-300' : 'border-transparent text-white/30 hover:text-white/60'}"
      >
        <!-- Dev icon -->
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
        </svg>
        {$t('gallery_tab_dev')}
        <span class="px-1.5 py-0.5 rounded bg-white/8 text-[9px] text-white/40">{devSessions.length}</span>
      </button>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-5">
      {#if err}<div class="text-red-400 text-xs bg-red-400/10 px-4 py-3 rounded-xl mb-4">{err}</div>{/if}

      {#if fetching}
        <div class="flex items-center justify-center h-48"><div class="w-5 h-5 border border-white/20 border-t-white/60 rounded-full animate-spin"></div></div>

      {:else if visibleSessions.length === 0}
        <div class="flex flex-col items-center justify-center h-48 gap-4 text-center">
          <div class="w-14 h-14 rounded-full bg-white/4 border border-white/8 flex items-center justify-center">
            {#if activeTab === 'dev'}
              <svg class="w-7 h-7 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            {:else}
              <svg class="w-7 h-7 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M10 12h4"/></svg>
            {/if}
          </div>
          <div>
            <p class="text-white/30 text-xs font-medium mb-1">
              {activeTab === 'dev' ? $t('gallery_empty_title_dev') : $t('gallery_empty_title')}
            </p>
            <p class="text-white/15 text-[10px] tracking-wide">
              {activeTab === 'dev' ? $t('gallery_empty_hint_dev') : $t('gallery_empty_hint')}
            </p>
          </div>
        </div>

      {:else}
        <div class="grid grid-cols-2 gap-4">
          {#each visibleSessions as meta}
            <div class="group bg-[#1a1a1a] border {activeTab === 'dev' ? 'border-purple-500/10 hover:border-purple-500/25' : 'border-white/8 hover:border-white/15'} rounded-xl overflow-hidden transition-colors flex flex-col">
              <!-- Thumbnail -->
              <div class="relative h-36 bg-[#0f0f0f] overflow-hidden flex-shrink-0">
                {#if meta.thumbnail}
                  <img src={meta.thumbnail} alt="" class="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"/>
                {:else}
                  <div class="w-full h-full flex items-center justify-center opacity-20">
                    {#if activeTab === 'dev'}
                      <!-- Dev placeholder: folder tree icon -->
                      <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
                        <rect x="8" y="10" width="18" height="12" rx="2" stroke="white" stroke-width="1"/>
                        <rect x="8" y="28" width="14" height="10" rx="2" stroke="white" stroke-width="0.75"/>
                        <rect x="8" y="44" width="14" height="10" rx="2" stroke="white" stroke-width="0.75"/>
                        <rect x="38" y="10" width="34" height="8" rx="2" stroke="white" stroke-width="1"/>
                        <rect x="38" y="24" width="26" height="7" rx="2" stroke="white" stroke-width="0.75"/>
                        <rect x="38" y="37" width="30" height="7" rx="2" stroke="white" stroke-width="0.75"/>
                        <rect x="38" y="50" width="20" height="6" rx="2" stroke="white" stroke-width="0.75"/>
                        <line x1="22" y1="16" x2="38" y2="14" stroke="white" stroke-width="0.75"/>
                        <line x1="22" y1="33" x2="38" y2="28" stroke="white" stroke-width="0.75"/>
                        <line x1="22" y1="33" x2="38" y2="41" stroke="white" stroke-width="0.75"/>
                        <line x1="22" y1="33" x2="38" y2="53" stroke="white" stroke-width="0.75"/>
                      </svg>
                    {:else}
                      <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
                        <rect x="4" y="16" width="22" height="28" rx="3" stroke="white" stroke-width="1"/>
                        <rect x="54" y="8" width="22" height="14" rx="3" stroke="white" stroke-width="1"/>
                        <rect x="54" y="30" width="22" height="14" rx="3" stroke="white" stroke-width="1"/>
                        <rect x="54" y="44" width="22" height="10" rx="3" stroke="white" stroke-width="1"/>
                        <line x1="26" y1="30" x2="54" y2="15" stroke="white" stroke-width="0.75"/>
                        <line x1="26" y1="30" x2="54" y2="37" stroke="white" stroke-width="0.75"/>
                        <line x1="26" y1="30" x2="54" y2="49" stroke="white" stroke-width="0.75"/>
                      </svg>
                    {/if}
                  </div>
                {/if}
                <button onclick={() => handleDelete(meta.id)} disabled={deletingId === meta.id}
                  class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/70 text-white/50 hover:text-white transition-all disabled:opacity-50"
                  title={$t('gallery_delete_tooltip')}>
                  {#if deletingId === meta.id}
                    <div class="w-2.5 h-2.5 border border-white/40 border-t-white rounded-full animate-spin"></div>
                  {:else}
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  {/if}
                </button>

                <!-- Type badge -->
                {#if activeTab === 'dev'}
                  <div class="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-purple-500/30 text-[9px] text-purple-300 tracking-wide font-medium">DEV</div>
                {/if}

                <div class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white/40 tracking-wide">{meta.node_count} {$t('gallery_nodes')}</div>
              </div>

              <!-- Meta -->
              <div class="px-3 pt-2.5 pb-1 flex-1">
                <p class="text-xs text-white/80 font-medium truncate leading-tight mb-0.5">{meta.title || meta.concept || 'Untitled'}</p>
                {#if meta.concept && meta.concept !== meta.title}
                  <p class="text-[10px] text-white/30 truncate mb-0.5">{meta.concept}</p>
                {/if}
                <p class="text-[10px] text-white/20">{formatDate(meta.timestamp)}</p>
              </div>

              <!-- Actions -->
              <div class="flex border-t border-white/5 mt-1 flex-shrink-0">
                <button onclick={() => handleLoad(meta)} class="flex-1 py-2.5 text-[10px] text-white/40 hover:text-white hover:bg-white/5 transition-colors font-medium tracking-widest uppercase">{$t('gallery_open')}</button>
                <div class="w-px bg-white/5"></div>
                <button onclick={() => handleExportJSON(meta)} class="flex-1 py-2.5 text-[10px] text-white/30 hover:text-white hover:bg-white/5 transition-colors tracking-widest uppercase">{$t('gallery_export_json')}</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
{/if}