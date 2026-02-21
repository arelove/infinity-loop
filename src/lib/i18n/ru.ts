import type { Translations } from './types';

export const ru: Translations = {
  // ── Landing ──────────────────────────────────────────────────────────────
  landing_title:       'ИСКАТЬ ЗНАНИЯ',
  landing_subtitle:    'ШАГНИ В НЕИЗВЕСТНОЕ',
  landing_placeholder: 'Задайте свой вопрос…',
  landing_load_session:'Загрузить сохранённую сессию',
  landing_hint_keys:   'Впервые здесь? Откройте ⚙ Настройки и добавьте API-ключи',

  // ── Deck cards ────────────────────────────────────────────────────────────
  deck_thoth:  'Колода Тота',
  deck_anubis: 'Колода Анубиса',
  deck_isis:   'Колода Исиды',

  // ── Graph toolbar ─────────────────────────────────────────────────────────
  graph_new_search: '← Новый поиск',
  graph_save:       'Сохранить',
  graph_saving:     'Сохранение…',
  graph_png:        'PNG',
  graph_cancel:     '✕ Отмена',
  graph_hint_click: 'Нажмите на любую карточку с вопросом, чтобы углубиться',

  // ── Hotkey hints (tooltips) ───────────────────────────────────────────────
  tooltip_gallery:    'Сохранённые графы',
  tooltip_settings:   'API-ключи',
  tooltip_new_search: 'Новый поиск (Ctrl+R)',
  tooltip_save:       'Сохранить граф (Ctrl+S)',
  tooltip_png:        'Экспорт в PNG (Ctrl+E)',
  tooltip_cancel:     'Отменить запрос',

  // ── Main node ─────────────────────────────────────────────────────────────
  node_loading_title:    'ПОСТИГАЮ МУДРОСТЬ',
  node_loading_subtitle: 'Пересекаю глубины знаний…',
  node_sources:          'Источники',

  // ── Settings modal ────────────────────────────────────────────────────────
  settings_title:          'API-ключи',
  settings_description:    'Хранятся в памяти приложения. Никогда не передаются никуда, кроме соответствующих API.',
  settings_tavily_label:   'Tavily Search',
  settings_gemini_label:   'Google Gemini',
  settings_cancel:         'Отмена',
  settings_save:           'Сохранить ключи',
  settings_saving:         'Сохранение…',
  settings_saved:          '✓ Сохранено',
  settings_get_tavily:     'Получить ключ Tavily ↗',
  settings_get_gemini:     'Получить ключ Gemini ↗',
  settings_high_graphics:      'Высокая графика',
  settings_high_graphics_hint: 'Звёзды, анимации, спецэффекты',

  // ── Gallery modal ─────────────────────────────────────────────────────────
  gallery_title:           'Сохранённые графы',
  gallery_description:     'Хранятся локально · изображения встроены',
  gallery_import:          'Импорт',
  gallery_tab_ai:          'ИИ Графы',
  gallery_tab_dev:         'Dev Проекты',
  gallery_empty_title:     'Нет сохранённых графов',
  gallery_empty_hint:      'Используйте кнопку «Сохранить» во время исследования',
  gallery_empty_title_dev: 'Нет сохранённых dev-проектов',
  gallery_empty_hint_dev:  'Используйте кнопку «Сохранить» в Dev-режиме',
  gallery_nodes:           'узлов',
  gallery_open:            'Открыть',
  gallery_export_json:     'JSON ↓',
  gallery_delete_tooltip:  'Удалить сессию',
  gallery_loading:         'Загрузка…',
  gallery_error_load:      'Ошибка загрузки',
  gallery_error_delete:    'Ошибка удаления',
  gallery_error_export:    'Ошибка экспорта',

  // ── Errors & alerts ───────────────────────────────────────────────────────
  error_search_failed:  'Поиск не удался',
  error_expand_failed:  'Не удалось развернуть',
  error_save_failed:    'Не удалось сохранить',
  error_png_failed:     'Экспорт PNG не удался. Попробуйте с меньшим графом.',
  error_import_failed:  'Ошибка импорта',
  error_invalid_file:   'Недопустимый файл сессии',

  // ── Snackbar success messages ─────────────────────────────────────────────
  snack_saved:          'Граф успешно сохранён',
  snack_png_exported:   'PNG экспортирован',
  snack_session_loaded: 'Сессия загружена',
  snack_png_done:       'PNG успешно экспортирован',

  // ── Onboarding hint ───────────────────────────────────────────────────────
  hint_welcome:    'Добро пожаловать в RabbitHoles! Три шага для начала:',
  hint_step_keys:  'Добавьте ключи',
  hint_step_search:'Введите тему',
  hint_step_click: 'Кликайте вопросы',
  hint_got_it:     'Понятно',

  // ── Hint tooltips ────────────────────────────────────────────────────────
  hint_no_keys:    'Добавьте API-ключи в ⚙ Настройках, чтобы начать',
  hint_keys_saved: 'API-ключи успешно сохранены',
  hint_click_node: 'Нажмите на узел, чтобы раскрыть его',
  hint_deck:       'Нажмите, чтобы вытащить вопрос из этой колоды',
  hint_search:     'Нажмите Enter или кнопку поиска',
  hint_save:       'Сохранить текущий граф (Ctrl+S)',

  // ── DEV mode ─────────────────────────────────────────────────────────────
  dev_toolbar_save:         'Сохранить',
  dev_toolbar_save_title:   'Сохранить проект (Ctrl+S)',
  dev_toolbar_clear:        'Очистить',
  dev_toolbar_clear_title:  'Очистить холст',
  dev_toolbar_import_files: 'Импорт файлов',
  dev_toolbar_import_folder:'Импорт папки',
  dev_toolbar_import_pdf:   'Импорт PDF',
  dev_toolbar_add_note:     'Заметка',
  dev_toolbar_ignore:       'Игнорировать',
  dev_toolbar_layout:       'Авторазмещение',
  dev_project_name:         'Название проекта…',
  dev_saved:                'Проект сохранён',
  dev_cleared:              'Холст очищен',
  dev_imported:             'Импортировано файлов: {count}',
  dev_import_failed:        'Ошибка импорта',
  dev_pdf_split:            'Разбить PDF',
  dev_ignore_title:         'Паттерны игнорирования',
  dev_ignore_placeholder:   'node_modules\n.git\ndist\n*.lock',
  dev_ignore_save:          'Сохранить',
  dev_ignore_cancel:        'Отмена',

  // ── Prompt helpers ────────────────────────────────────────────────────────
  prompt_language_instruction:    'Пожалуйста, отвечай на русском языке.',
  fallback_question_implications: 'Каковы более широкие последствия {topic}?',
  fallback_question_history:      'Как исторически менялось понимание {topic}?',
  fallback_question_skeptic:      'Каковы наиболее весомые аргументы против {topic}?',
};