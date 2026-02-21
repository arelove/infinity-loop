<script lang="ts">
  import { DEFAULT_IGNORE_PATTERNS } from '$lib/devTypes';

  interface Props {
    patterns: string[];
    onSave: (patterns: string[]) => void;
    onClose: () => void;
  }
  let { patterns, onSave, onClose }: Props = $props();

  // Editable textarea — one pattern per line
  let text = $state(patterns.join('\n'));

  function handleSave() {
    const parsed = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    onSave(parsed);
  }

  function resetToDefault() {
    text = DEFAULT_IGNORE_PATTERNS.join('\n');
  }
</script>

<div
  class="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-md"
  onclick={onClose}
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div
    class="modal"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="none"
  >
    <!-- Header -->
    <div class="modal-header">
      <div>
        <h2 class="title">Ignore Patterns</h2>
        <p class="subtitle">Files and folders matching these names will be skipped during import</p>
      </div>
      <button onclick={onClose} class="close-btn">×</button>
    </div>

    <!-- Editor -->
    <div class="modal-body">
      <p class="hint">One pattern per line · matches folder/file names exactly</p>
      <textarea
        bind:value={text}
        class="pattern-editor"
        rows="16"
        spellcheck="false"
        placeholder="node_modules&#10;target&#10;.git&#10;..."
      ></textarea>
    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <button onclick={resetToDefault} class="btn-secondary">Reset to defaults</button>
      <div style="flex:1"></div>
      <button onclick={onClose} class="btn-cancel">Cancel</button>
      <button onclick={handleSave} class="btn-save">Save patterns</button>
    </div>
  </div>
</div>

<style>
  .modal {
    background: #111;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    width: 100%;
    max-width: 460px;
    overflow: hidden;
    box-shadow: 0 16px 64px rgba(0,0,0,0.7);
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 22px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .title {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.8);
    margin-bottom: 3px;
  }
  .subtitle {
    font-size: 10px;
    color: rgba(255,255,255,0.3);
    max-width: 300px;
    line-height: 1.5;
  }
  .close-btn {
    font-size: 20px;
    color: rgba(255,255,255,0.3);
    background: none;
    border: none;
    cursor: pointer;
    line-height: 1;
    padding: 0 4px;
    transition: color 0.15s;
  }
  .close-btn:hover { color: rgba(255,255,255,0.7); }

  .modal-body {
    padding: 16px 22px;
  }
  .hint {
    font-size: 10px;
    color: rgba(255,255,255,0.22);
    margin-bottom: 10px;
    letter-spacing: 0.03em;
  }

  .pattern-editor {
    width: 100%;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 12px 14px;
    font-family: monospace;
    font-size: 11px;
    color: rgba(255,255,255,0.65);
    resize: vertical;
    outline: none;
    line-height: 1.7;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .pattern-editor:focus { border-color: rgba(99,179,237,0.3); }
  .pattern-editor::placeholder { color: rgba(255,255,255,0.15); }

  .modal-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 22px;
    border-top: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02);
  }

  button {
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    border: 1px solid transparent;
  }
  .btn-secondary {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.35);
  }
  .btn-secondary:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }

  .btn-cancel {
    background: transparent;
    border-color: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.3);
  }
  .btn-cancel:hover { color: rgba(255,255,255,0.6); }

  .btn-save {
    background: rgba(99,179,237,0.12);
    border-color: rgba(99,179,237,0.25);
    color: rgba(147,210,255,0.9);
  }
  .btn-save:hover { background: rgba(99,179,237,0.2); }
</style>