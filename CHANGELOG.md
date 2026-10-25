# Changelog

All notable changes to this Pi configuration are documented here.

## 2026-10-25

### Changed

- Verified installed Pi 1.4.0 against the latest npm release and aligned all local Pi development dependencies and lockfiles with it.
- Updated pinned `pi-web-access` from 0.38.0 to 0.44.0 and refreshed model catalogs.
- Replaced `/answer`’s unavailable Codex `gpt-5.5` preference with `gpt-6.1-sol`; kept Haiku 4.5 as the credential fallback. Routed extraction through Pi’s authenticated, provider-neutral model runtime and surfaced provider errors instead of treating them as malformed output.
- Added published schema references for settings and the Gruvbox theme, replacing the theme’s obsolete source-schema URL.
- Pinned patched `undici` 8.12.3 across local package trees and root `zod` 4.x to 4.6.7; refreshed vulnerable transitive dependencies, including the gitignored managed-package cache, without downgrading Pi or forcing major upgrades.
- Added offline tests for loading all local extensions and the custom theme, plus `/answer` model selection, credential fallback, and RPC guards. Included them in `pnpm run check`.
- Updated the README and feature guide for Pi 1.2–1.4, including pinned-package update behavior, compaction output limits, and codemode worker queuing.
- Documented that the separate Pi 1.4.0 CLI installation still pins vulnerable `undici` 8.10.2; left its vendor-managed files intact because no newer Pi release is available.
- Verified authentication readiness without refreshing credentials, enabled MCP connectivity, offline model startup, and local dependency audits. Left provider/model preferences, the disabled Paper server, credentials, and session history unchanged.

## 2026-10-10

### Changed

- Aligned local Pi development dependencies and extension lockfiles with the installed Pi 1.1.0.
- Updated the pinned `pi-web-access` package from 0.35.0 to 0.38.0.
- Updated the root `brace-expansion` override to patched 5.0.12.
- Restricted custom terminal headers, the git widget, `/answer`, and `/toggle-skills` to TUI mode; RPC's `hasUI` does not support custom terminal components.
- Stopped the git widget from starting polling timers in headless modes and cleared stale header render callbacks on shutdown.
- Added a root `pnpm run check` command for extension type checks and tests.
- Added recorded `durationMs` display to custom `webfetch` results, with tests for successful, failed, partial, missing, invalid, and zero durations.
- Added `docs/pi-features.md` with usage examples for built-in status reporting, tool filters, codemode image persistence, and project MCP overrides. Kept excluded models and local servers unconfigured, and documented why Codex ignores per-thinking-level sampling overrides.
- Corrected image-persistence docs and documented automatic `~/.agents/skills` discovery.
- Shortened the canonical Railway skill description in `~/.agents/skills/use-railway/SKILL.md` to meet Pi's 1024-character limit, without copying or relocating it. This skill file lives outside this repository.

## 2026-10-03

### Added

- Enabled built-in `tool_search` alongside codemode for direct calls to discovered tools.
- Enabled terminal-tab progress where the terminal supports it.
- Set cache warming explicitly to `streaming`. Eligible caches refresh during active runs, not while idle.

### Changed

- Updated the README to match installed packages, MCP servers, and commands.
- Documented built-in image generation and classifiers. Both use existing provider credentials without another extension.
- Kept custom UI, secret masking, web fetch, and workflow extensions that provide distinct behavior.

### Removed

- Uninstalled `pi-interview` and `@plannotator/pi-extension` at the user's request.
- Removed `update.ts`. Use the built-in shell command `pi update` instead.
- Removed `continue-after-compaction.ts`. Pi handles automatic compaction continuation and recovery without an extra prompt after every compaction.
- Removed stale README entries for Linear and Ponytail, which are not configured.

## 2026-10-02

### Added

- Enabled Pi's built-in `codemode` tool with `"defaultTools": ["+codemode"]`.
- Added `mcp.json` for Pi's built-in MCP support with `openai-docs`, `linear` (OAuth), and a disabled `paper` server, all using the default `codemode` exposure.
- Added `assets/void.png`, copied from the Neovim dashboard, for the startup header.

### Changed

- Aligned Pi development dependencies and extension lockfiles with Pi 1.0.0.
- Changed the default model from `gpt-5.6-sol` to `gpt-6.1-sol`, Pi's new OpenAI Codex default.
- Set `quietStartup` to `"header"` so startup keeps the custom header but hides the model scope line and loaded-resource listing.
- Replaced the blue "Pi" ASCII header with the Neovim dashboard's VOID art: the chafa-rendered image beside Gruvbox-yellow lettering, with a Gruvbox gradient subtitle. The image renders asynchronously, falls back to the lettering when `chafa` is missing, and stays within narrow terminal widths.
- Ignored MCP OAuth credentials (`mcp-auth.json`), MCP logs, and crash reports.

### Removed

- Removed unused startup-listing helpers from `flow-title.ts`; `quietStartup: "header"` now hides the listing natively.

## 2026-09-02

### Changed

- Aligned Pi development dependencies and extension lockfiles with Pi 0.84.4.

## 2026-08-29

### Changed

- Updated the README to match the remaining extensions, commands, verification steps, and file layout.
- Corrected the documented Plannotator plan-mode command and preview image path.
- Removed stale package metadata and ignore rules for integrations that are no longer present.

### Removed

- Removed the unused MCP adapter, its invalid server configuration, commands, tool, cache rule, dependencies, and documentation.
- Removed the empty ephemeral resource catalog extension.
- Removed duplicate `edit-article` and `handoff` skill symlinks; their canonical copies remain under `~/.agents/skills`.
- Removed the placeholder root test script that always failed.

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
