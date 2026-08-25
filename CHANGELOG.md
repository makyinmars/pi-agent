# Changelog

All notable changes to this Pi configuration are documented here.

## 2026-08-25

### Changed

- Aligned Pi development dependencies and extension lockfiles with Pi 0.84.3.
- Enabled cache-miss and compaction usage notices.
- Configured fullscreen exit to restore the previous screen and print only the session resume hint.
- Updated setup documentation for session-scoped model/thinking selection and explicit `Ctrl+S` persistence.
- Simplified the self-update extension to delegate to Pi's built-in, safer `pi update` flow.

## 2026-08-17

### Added

- Added `pi-interview` for structured clarification forms with rich question and response types.
- Added Ponytail for minimal-change coding guidance and over-engineering review skills.

### Changed

- Changed the default thinking level from `high` to `medium`.
- Updated the README to match the active package, command, tool, shortcut, and file configuration.

### Removed

- Removed `pi-subagents`, its model routing and watchdog configuration, and generated runtime data.
- Removed the local subagent review-mode extension, command, shortcut, and status indicator.

## 2026-08-14

### Changed

- Aligned Pi development dependencies and extension lockfiles with Pi 0.84.2.
- Upgraded pinned `pi-web-access` from 0.18.0 to 0.22.0 for current Pi auth-header types, external bounded content caching, and cache path hardening.
- Moved the OpenAI Codex fast-mode shortcut to `Ctrl+Shift+Alt+F`, preserving `Ctrl+Shift+F` for Pi's fullscreen transcript search.
- Opted the `--update` extension flow into slash-command dispatch with `expandPromptTemplates`.
- Added explicit Gruvbox colors for fullscreen scrollbars and transcript-search matches.

## 2026-08-12

### Changed

- Refreshed the Pi setup preview image.

## 2026-08-07

### Added

- Added pinned `pi-web-access@0.18.0` with a tracked direct-Exa configuration template.
- Added fullscreen TUI, native streaming Mermaid, and maximum-thinking theme support for Pi 0.84.

### Changed

- Aligned Pi development dependencies, extension lockfiles, and setup documentation with Pi 0.84.1.
- Updated the Herdr integration to report state only for TUI sessions and preserve lifecycle authority across shutdowns.
- Upgraded Pi development dependencies and extension lockfiles from 0.83 to 0.84.
- Updated extension compatibility for nullable provider request headers.
- Updated the default UI and thinking-level presentation.
- Kept the local `web-tools` extension focused on its SSRF-protected `webfetch` tool.

### Removed

- Removed the legacy local `websearch` tool, Exa MCP protocol/provider implementation, and associated tests.
- Removed reliance on the third-party `m.mulroy.dev` search proxy; search now uses Exa's direct API through `EXA_API_KEY`.
