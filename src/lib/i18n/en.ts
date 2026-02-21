import type { Translations } from './types';

export const en: Translations = {
  // ── Landing ──────────────────────────────────────────────────────────────
  landing_title:       'SEEK KNOWLEDGE',
  landing_subtitle:    'VENTURE INTO THE UNKNOWN',
  landing_placeholder: 'Ask your question…',
  landing_load_session:'Load saved session',
  landing_hint_keys:   'First time? Open ⚙ Settings to add your API keys',

  // ── Deck cards ────────────────────────────────────────────────────────────
  deck_thoth:  'Deck of Thoth',
  deck_anubis: 'Deck of Anubis',
  deck_isis:   'Deck of Isis',

  // ── Graph toolbar ─────────────────────────────────────────────────────────
  graph_new_search: '← New search',
  graph_save:       'Save',
  graph_saving:     'Saving…',
  graph_png:        'PNG',
  graph_cancel:     '✕ Cancel',
  graph_hint_click: 'Click any question card to dive deeper',

  // ── Hotkey hints (tooltips) ───────────────────────────────────────────────
  tooltip_gallery:    'Saved graphs',
  tooltip_settings:   'API Keys',
  tooltip_new_search: 'New search (Ctrl+R)',
  tooltip_save:       'Save graph (Ctrl+S)',
  tooltip_png:        'Export as PNG (Ctrl+E)',
  tooltip_cancel:     'Cancel request',

  // ── Main node ─────────────────────────────────────────────────────────────
  node_loading_title:    'SEEKING WISDOM',
  node_loading_subtitle: 'Traversing the depths of knowledge…',
  node_sources:          'Sources',

  // ── Settings modal ────────────────────────────────────────────────────────
  settings_title:          'API Keys',
  settings_description:    'Stored in Rust app state. Never sent anywhere except the respective APIs.',
  settings_tavily_label:   'Tavily Search',
  settings_gemini_label:   'Google Gemini',
  settings_cancel:         'Cancel',
  settings_save:           'Save Keys',
  settings_saving:         'Saving…',
  settings_saved:          '✓ Saved',
  settings_get_tavily:     'Get Tavily key ↗',
  settings_get_gemini:     'Get Gemini key ↗',
  settings_high_graphics:      'High Graphics',
  settings_high_graphics_hint: 'Stars, animations, visual effects',

  // ── Gallery modal ─────────────────────────────────────────────────────────
  gallery_title:           'Saved Graphs',
  gallery_description:     'Stored locally · images are embedded',
  gallery_import:          'Import',
  gallery_tab_ai:          'AI Graphs',
  gallery_tab_dev:         'Dev Projects',
  gallery_empty_title:     'No saved graphs yet',
  gallery_empty_hint:      'Use the "Save" button while exploring to preserve a session',
  gallery_empty_title_dev: 'No saved dev projects yet',
  gallery_empty_hint_dev:  'Use the "Save" button in Dev mode to preserve a project',
  gallery_nodes:           'nodes',
  gallery_open:            'Open',
  gallery_export_json:     'JSON ↓',
  gallery_delete_tooltip:  'Delete session',
  gallery_loading:         'Loading…',
  gallery_error_load:      'Load failed',
  gallery_error_delete:    'Delete failed',
  gallery_error_export:    'Export failed',

  // ── Errors & alerts ───────────────────────────────────────────────────────
  error_search_failed:  'Search failed',
  error_expand_failed:  'Expand failed',
  error_save_failed:    'Save failed',
  error_png_failed:     'PNG export failed. Try a smaller graph.',
  error_import_failed:  'Import failed',
  error_invalid_file:   'Invalid session file',

  // ── Snackbar success messages ─────────────────────────────────────────────
  snack_saved:          'Graph saved successfully',
  snack_png_exported:   'PNG exported',
  snack_session_loaded: 'Session loaded',
  snack_png_done:       'PNG exported successfully',

  // ── Onboarding hint ───────────────────────────────────────────────────────
  hint_welcome:    'Welcome to RabbitHoles! Follow three steps to get started:',
  hint_step_keys:  'Add API keys',
  hint_step_search:'Search a topic',
  hint_step_click: 'Click questions',
  hint_got_it:     'Got it',

  // ── Hint tooltips ────────────────────────────────────────────────────────
  hint_no_keys:    'Add your API keys in ⚙ Settings to get started',
  hint_keys_saved: 'API keys saved successfully',
  hint_click_node: 'Click a node to expand it',
  hint_deck:       'Click to draw a question from this deck',
  hint_search:     'Press Enter or click to search',
  hint_save:       'Save the current graph (Ctrl+S)',

  // ── DEV mode ─────────────────────────────────────────────────────────────
  dev_toolbar_save:         'Save',
  dev_toolbar_save_title:   'Save project (Ctrl+S)',
  dev_toolbar_clear:        'Clear',
  dev_toolbar_clear_title:  'Clear canvas',
  dev_toolbar_import_files: 'Import Files',
  dev_toolbar_import_folder:'Import Folder',
  dev_toolbar_import_pdf:   'Import PDF',
  dev_toolbar_add_note:     'Add Note',
  dev_toolbar_ignore:       'Ignore',
  dev_toolbar_layout:       'Auto Layout',
  dev_project_name:         'Project name…',
  dev_saved:                'Project saved',
  dev_cleared:              'Canvas cleared',
  dev_imported:             'Imported {count} files',
  dev_import_failed:        'Import failed',
  dev_pdf_split:            'Split PDF',
  dev_ignore_title:         'Ignore Patterns',
  dev_ignore_placeholder:   'node_modules\n.git\ndist\n*.lock',
  dev_ignore_save:          'Save',
  dev_ignore_cancel:        'Cancel',

  // ── Prompt helpers ────────────────────────────────────────────────────────
  prompt_language_instruction:    'Please respond in English.',
  fallback_question_implications: 'What are the broader implications of {topic}?',
  fallback_question_history:      'How has the understanding of {topic} evolved historically?',
  fallback_question_skeptic:      'What are the strongest arguments against {topic}?',
};