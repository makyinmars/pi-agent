# Changelog

All notable changes to this Pi configuration are documented here.

## 2026-08-07

### Added

- Added pinned `pi-web-access@0.18.0` with a tracked direct-Exa configuration template.
- Added fullscreen TUI, native streaming Mermaid, and maximum-thinking theme support for Pi 0.84.

### Changed

- Upgraded Pi development dependencies and extension lockfiles from 0.83 to 0.84.
- Updated extension compatibility for nullable provider request headers.
- Updated the default UI and thinking-level presentation.
- Kept the local `web-tools` extension focused on its SSRF-protected `webfetch` tool.

### Removed

- Removed the legacy local `websearch` tool, Exa MCP protocol/provider implementation, and associated tests.
- Removed reliance on the third-party `m.mulroy.dev` search proxy; search now uses Exa's direct API through `EXA_API_KEY`.
