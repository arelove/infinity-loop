# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-07-14

### Added
- Multiple AI providers. In addition to Google Gemini, the app now supports
  OpenAI (ChatGPT), Anthropic (Claude), xAI (Grok), NVIDIA NIM, and any local
  OpenAI-compatible server via Ollama. The active provider and model are chosen
  in Settings.
- Custom model entry. The model field accepts any model id, not just the ones
  in the suggestion list.
- Custom window title bar with drag-to-move, double-click to maximize, and
  minimize / maximize / close controls. Native window decorations are disabled.
- Cross-platform release builds. A tagged push (`v*`) triggers a GitHub Actions
  workflow that produces installers for Windows (NSIS), macOS (dmg, Apple
  Silicon and Intel), and Linux (AppImage, deb), and attaches them to a draft
  GitHub Release whose body is filled from the matching section of this file.
- Continuous integration workflow running `svelte-check`, `cargo fmt`,
  `cargo clippy`, and `cargo test` on every push and pull request.
- Rust unit tests covering provider resolution, request-body construction, and
  streaming delta parsing.

### Changed
- All API keys are now stored and used exclusively in the Rust backend and are
  persisted to a `config.json` file in the OS application-config directory. The
  frontend only ever learns whether a key is set, never its value.
- All LLM network calls (main search, Dev-mode helpers, and PDF analysis) now
  run in the Rust backend rather than the web view. Streaming is delivered to
  the frontend over a Tauri channel.
- Request cancellation is handled by the backend via a request id instead of an
  `AbortController` in the web view.

### Security
- API keys are no longer stored in `localStorage` or sent from the frontend.
  Keys entered in earlier versions are migrated into the backend on first launch
  and removed from `localStorage`.

## [1.0.0] - Initial release

### Added
- Seek mode: enter a topic and build an interactive AI knowledge graph from
  Gemini generation and Tavily web search.
- Dev mode: load a codebase and map its architecture.
- Session save / load, PNG export, and JSON import.
- English and Russian localization.
- Windows installer (NSIS) supporting Windows 10 and 11.

[Unreleased]: https://github.com/arelove/infinity-loop/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/arelove/infinity-loop/releases/tag/v1.1.0
[1.0.0]: https://github.com/arelove/infinity-loop/releases/tag/v1.0.0
