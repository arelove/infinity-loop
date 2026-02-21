/**
 * Add a new key here → TypeScript will force you to add it to every locale file.
 * Add a new locale → create `src/lib/i18n/xx.ts`, import it in index.ts.
 */
export interface Translations {
  // Landing
  landing_title:       string;
  landing_subtitle:    string;
  landing_placeholder: string;
  landing_load_session:string;
  landing_hint_keys:   string;

  // Deck cards
  deck_thoth:  string;
  deck_anubis: string;
  deck_isis:   string;

  // Graph toolbar
  graph_new_search: string;
  graph_save:       string;
  graph_saving:     string;
  graph_png:        string;
  graph_cancel:     string;
  graph_hint_click: string;

  // Tooltips
  tooltip_gallery:    string;
  tooltip_settings:   string;
  tooltip_new_search: string;
  tooltip_save:       string;
  tooltip_png:        string;
  tooltip_cancel:     string;

  // Main node
  node_loading_title:    string;
  node_loading_subtitle: string;
  node_sources:          string;

  // Settings modal
  settings_title:          string;
  settings_description:    string;
  settings_tavily_label:   string;
  settings_gemini_label:   string;
  settings_cancel:         string;
  settings_save:           string;
  settings_saving:         string;
  settings_saved:          string;
  settings_get_tavily:     string;
  settings_get_gemini:     string;
  settings_high_graphics:      string;
  settings_high_graphics_hint: string;

  // Gallery modal
  gallery_title:           string;
  gallery_description:     string;
  gallery_import:          string;
  gallery_tab_ai:          string;  // ← NEW: AI tab label
  gallery_tab_dev:         string;  // ← NEW: DEV tab label
  gallery_empty_title:     string;
  gallery_empty_hint:      string;
  gallery_empty_title_dev: string;  // ← NEW: empty state for dev tab
  gallery_empty_hint_dev:  string;  // ← NEW: empty hint for dev tab
  gallery_nodes:           string;
  gallery_open:            string;
  gallery_export_json:     string;
  gallery_delete_tooltip:  string;
  gallery_loading:         string;
  gallery_error_load:      string;
  gallery_error_delete:    string;
  gallery_error_export:    string;

  // Errors
  error_search_failed:  string;
  error_expand_failed:  string;
  error_save_failed:    string;
  error_png_failed:     string;
  error_import_failed:  string;
  error_invalid_file:   string;

  // Snackbar success messages
  snack_saved:          string;
  snack_png_exported:   string;
  snack_session_loaded: string;
  snack_png_done:       string;

  // Onboarding hint
  hint_welcome:    string;
  hint_step_keys:  string;
  hint_step_search:string;
  hint_step_click: string;
  hint_got_it:     string;

  // Hint tooltips
  hint_no_keys:    string;
  hint_keys_saved: string;
  hint_click_node: string;
  hint_deck:       string;
  hint_search:     string;
  hint_save:       string;

  // ── DEV mode ─────────────────────────────────────────────────────────────
  dev_toolbar_save:        string;  // Save button in DevToolbar
  dev_toolbar_save_title:  string;  // Tooltip for save button
  dev_toolbar_clear:       string;  // Clear canvas button
  dev_toolbar_clear_title: string;
  dev_toolbar_import_files:string;  // Import files button
  dev_toolbar_import_folder:string;
  dev_toolbar_import_pdf:  string;
  dev_toolbar_add_note:    string;
  dev_toolbar_ignore:      string;  // Ignore settings button
  dev_toolbar_layout:      string;  // Auto layout button
  dev_project_name:        string;  // Placeholder for project name input
  dev_saved:               string;  // Snackbar: project saved
  dev_cleared:             string;  // Snackbar: canvas cleared
  dev_imported:            string;  // Snackbar: files imported (supports {count})
  dev_import_failed:       string;
  dev_pdf_split:           string;  // PDF split modal title
  dev_ignore_title:        string;  // Ignore patterns modal title
  dev_ignore_placeholder:  string;  // Textarea placeholder
  dev_ignore_save:         string;
  dev_ignore_cancel:       string;

  // Prompt helpers (used in api.ts)
  prompt_language_instruction:    string;
  fallback_question_implications: string;
  fallback_question_history:      string;
  fallback_question_skeptic:      string;

  
}

export type LocaleCode = 'en' | 'ru'; // add 'de' | 'zh' etc. here when ready