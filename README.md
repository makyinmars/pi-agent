# 🥧 Pi Agent Setup

A personalized [Pi](https://pi.dev) AI coding agent configuration with custom extensions, commands, themes, and MCP integration.

> **Disclaimer:** This is a personal setup, not a recommended configuration. It's a reference for what's possible with Pi's extension system.

![Pi setup preview](assets/preview-maky.png)

---

## Table of Contents

- [What is Pi?](#what-is-pi)
- [Getting Started](#getting-started)
- [Configuration (`settings.json`)](#configuration-settingsjson)
- [Thinking Levels / Effort](#thinking-levels--effort)
- [Extensions (Plugins)](#extensions-plugins)
- [Commands (Controllers)](#commands-controllers)
- [MCP Integration](#mcp-integration)
- [Themes](#themes)
- [File Layout](#file-layout)

---

## What is Pi?

[Pi](https://pi.dev) is a terminal-based AI coding assistant with read, bash, edit, and write tools. It supports a powerful extension system that lets you add custom tools, commands, UI widgets, event hooks, and MCP server integration — all via TypeScript files.

---

## Getting Started

1. **Install Pi:** Visit <https://pi.dev> and follow the installation instructions.
2. **Clone this repo** to `~/.pi/agent`:
   ```sh
   git clone https://github.com/makyinmars/pi-agent.git ~/.pi/agent
   ```
3. **Install dependencies:**
   ```sh
   cd ~/.pi/agent && pnpm install
   ```
4. **(Optional) Web search:** If you want the Firecrawl web search tools, get a [Firecrawl API key](https://firecrawl.dev) and add it to `.env`:
   ```sh
   echo "FIRECRAWL_API_KEY=your-key-here" > ~/.pi/agent/.env
   ```
5. **Login:** Open Pi and run `/login` with your provider (e.g., Codex). Pick a model and you're ready.

---

## Configuration (`settings.json`)

The main configuration file is `~/.pi/agent/settings.json`:

```json
{
  "lastChangelogVersion": "0.81.1",
  "defaultProvider": "openai-codex",
  "defaultModel": "gpt-5.6-sol",
  "defaultThinkingLevel": "high",
  "theme": "gruvbox-dark-hard",
  "packages": ["npm:@plannotator/pi-extension"],
  "hideThinkingBlock": true
}
```

| Key | Description |
|-----|-------------|
| `defaultProvider` | The AI provider to use (e.g., `openai-codex`, `google`, `anthropic`). |
| `defaultModel` | The default model ID (e.g., `gpt-5.6-sol`). |
| `defaultThinkingLevel` | Controls the reasoning/effort level. See [Thinking Levels](#thinking-levels--effort). |
| `theme` | The UI theme to load from `themes/`. |
| `packages` | NPM packages to load as Pi extensions. |
| `hideThinkingBlock` | When `true`, hides the model's thinking/reasoning output in the TUI. |

You can also override settings per-launch with CLI flags:
```sh
pi --thinking high --model gpt-5.6-sol --provider openai-codex
```

---

## Thinking Levels / Effort

Pi supports configurable reasoning/effort levels. You can change them three ways:

| Method | How |
|--------|-----|
| **Config file** | Set `"defaultThinkingLevel"` in `settings.json` |
| **CLI flag** | `pi --thinking high` |
| **Keyboard (TUI)** | Press `Tab` to cycle through levels interactively |

Valid levels (lowest to highest):

| Level | Description |
|-------|-------------|
| `off` | No reasoning tokens |
| `minimal` | Bare minimum thinking |
| `low` | Light reasoning |
| `medium` | Balanced |
| `high` | Deep reasoning |
| `xhigh` | Extra deep reasoning |
| `max` | Maximum reasoning budget |

---

## Extensions (Plugins)

Extensions are TypeScript files in `extensions/` that hook into Pi's lifecycle. They can register **tools**, **commands**, **UI widgets**, **event handlers**, and **flags**.

### Extension Overview

| File | Type | Description |
|------|------|-------------|
| [`firecrawl-search.ts`](extensions/firecrawl-search.ts) | Tools | Web search and page scraping via Firecrawl API |
| [`diff.ts`](extensions/diff.ts) | Command + Event hooks | Tracks files changed during agent runs and opens them in Zed |
| [`copy-all.ts`](extensions/copy-all.ts) | Command | Copies all conversation messages to clipboard |
| [`flow-title.ts`](extensions/flow-title.ts) | UI Header + Command | Animated blue gradient ASCII "Pi" header with live model/project info |
| [`git-status-widget.ts`](extensions/git-status-widget.ts) | UI Widget | Status bar widget showing current git branch and unstaged file count |
| [`tps-tracker.ts`](extensions/tps-tracker.ts) | UI Status + Events | Tracks and displays tokens-per-second during model generation |
| [`openai-codex-fast-mode.ts`](extensions/openai-codex-fast-mode.ts) | Event hooks | Enables OpenAI priority service tier for Codex models and shows a 🏎️ indicator |
| [`update.ts`](extensions/update.ts) | Command + Flag | Updates Pi using the detected install method (vp, bun, npm, brew, or native) |
| [`usage.ts`](extensions/usage.ts) | Command | Generates a detailed usage/cost report across 1/7/30/90 day windows |
| [`yeet.ts`](extensions/yeet.ts) | Command | One-shot "add, commit, and push" with auto-generated commit messages |
| [`lg.ts`](extensions/lg.ts) | Command | Summarizes unstaged git changes with per-file +/- line counts |
| [`zsh-user-bash.ts`](extensions/zsh-user-bash.ts) | Event hook | Runs bash commands through zsh with proper shell configuration |
| [`herdr-agent-state.ts`](extensions/herdr-agent-state.ts) | Event hooks | Reports agent state (working/blocked/idle) to Herdr via Unix socket |

### Extension Details

#### 🔥 `firecrawl-search.ts` — Web Search & Scrape Tools
Registers two tools:
- **`search`** — Searches the web via [Firecrawl](https://firecrawl.dev) with support for web, news, and image results. Can optionally scrape result pages for markdown content.
- **`scrape`** — Fetches a single URL and returns cleaned markdown suitable for agent context.

Requires `FIRECRAWL_API_KEY` in `.env` or environment.

#### 📝 `diff.ts` — Changed File Tracker
- Hooks into `agent_start`, `tool_result`, and `agent_end` events to track files modified during each agent run.
- Registers the `/diff` command to list and open changed files in [Zed](https://zed.dev).
- Supports `/diff list` (inline listing) and `/diff clear` (reset tracking).

#### 📋 `copy-all.ts` — Conversation Copier
- Registers `/copy-all` to copy all user and assistant messages from the current session to the clipboard (via `pbcopy` on macOS).

#### 🌊 `flow-title.ts` — Animated Gradient Header
- Replaces Pi's default header with an animated blue gradient ASCII art "Pi" logo.
- Shows the current model ID and project name in the subtitle.
- Updates live on model selection changes.
- Commands: `/flow-title` (enable) and `/flow-title-builtin` (restore default header).

#### 📊 `git-status-widget.ts` — Git Status Widget
- Displays a status bar widget with the current git branch and unstaged file count.
- Polls every 2 seconds and refreshes on input and tool execution events.

#### ⏱️ `tps-tracker.ts` — Tokens Per Second Tracker
- Tracks tokens-per-second during model generation in real-time.
- Shows live TPS in the status bar during generation.
- Reports final TPS statistics (total tokens, streaming time) at the end of each agent run.

#### 🏎️ `openai-codex-fast-mode.ts` — Priority Mode
- Intercepts `before_provider_request` events to set `service_tier: "priority"` on OpenAI Codex Responses API calls.
- Patches the footer component to display a 🏎️ emoji next to the provider name when fast mode is active.

#### 🔄 `update.ts` — Self-Updater
- Registers `/update` command and `--update` flag.
- Auto-detects the installation method (vite-plus, bun, npm, brew, or native binary).
- Retries transient failures (timeouts, 429s, 502/503/504s) up to 3 times.
- Reports before/after version numbers.

#### 💰 `usage.ts` — Usage & Cost Report
- Registers `/usage` command.
- Sends a detailed prompt that makes the agent parse Pi session files and Codex CLI sessions to produce a markdown cost report.
- Covers 1-day, 7-day, 30-day, and 90-day windows with per-model token counts and USD pricing from [models.dev](https://models.dev).

#### 🚀 `yeet.ts` — Quick Commit & Push
- Registers `/yeet` command.
- Adds all changes, auto-generates a commit message, commits, and pushes to the current branch.
- Handles upstream tracking setup and outputs remote/PR URLs.
- Accepts additional instructions as arguments: `/yeet fix the typo in README`.

#### 📈 `lg.ts` — Local Git Summary
- Registers `/lg` command.
- Sends a prompt that makes the agent summarize unstaged changes with per-file +/- line counts.

#### 🐚 `zsh-user-bash.ts` — Zsh Shell Integration
- Hooks into `user_bash` events to route bash commands through zsh.
- Uses `zsh -fc` (non-interactive) to avoid powerlevel10k/gitstatus warnings.
- Respects `PI_USER_BASH_SHELL` env var and `$SHELL` for custom shell paths.

#### 🤖 `herdr-agent-state.ts` — Herdr Integration
- Installed and managed by [Herdr](https://herdr.dev).
- Reports agent lifecycle state (`working`, `blocked`, `idle`) to Herdr via Unix socket.
- Tracks session IDs and paths for Herdr's pane management.
- Only activates when `HERDR_ENV=1` and `HERDR_SOCKET_PATH` are set.

---

## Commands (Controllers)

All slash commands registered by extensions:

| Command | Extension | Description |
|---------|-----------|-------------|
| `/search` | firecrawl-search | Search the web (tool, not command — auto-invoked by agent) |
| `/scrape` | firecrawl-search | Scrape a URL (tool, not command — auto-invoked by agent) |
| `/diff` | diff | Open changed files in Zed |
| `/diff list` | diff | List changed files inline |
| `/diff clear` | diff | Clear the changed file tracker |
| `/copy-all` | copy-all | Copy all messages to clipboard |
| `/flow-title` | flow-title | Enable the animated gradient header |
| `/flow-title-builtin` | flow-title | Restore Pi's built-in header |
| `/update` | update | Update Pi to the latest version |
| `/usage` | usage | Generate a usage/cost report |
| `/yeet` | yeet | Add, commit, and push changes |
| `/yeet <msg>` | yeet | Same with additional instructions |
| `/lg` | lg | Summarize unstaged git changes |

**Flags:**

| Flag | Extension | Description |
|------|-----------|-------------|
| `--update` | update | Run `/update` at session start |

---

## MCP Integration

The `extensions/pi-mcp/` directory contains a full MCP (Model Context Protocol) adapter with OAuth support. It's a forked and enhanced version of `pi-mcp-adapter` that provides:

- **Server management** — Connect to and manage MCP servers
- **OAuth authentication** — Full OAuth flow for MCP servers that require it
- **Tool registration** — Automatically registers MCP server tools as Pi tools
- **Resource tools** — Exposes MCP resources as Pi tools
- **UI panel** — In-TUI panel for managing MCP connections
- **Consent management** — User consent flow for tool execution

Key files in `pi-mcp/src/`:

| File | Purpose |
|------|---------|
| `index.ts` | Entry point — registers the MCP extension |
| `server-manager.ts` | Manages MCP server lifecycle |
| `mcp-auth.ts` / `mcp-oauth-provider.ts` | OAuth authentication flows |
| `tool-registrar.ts` | Registers MCP tools as Pi tools |
| `direct-tools.ts` | Direct tool execution |
| `resource-tools.ts` | MCP resource exposure |
| `ui-server.ts` / `ui-session.ts` | UI server for MCP management panel |
| `consent-manager.ts` | User consent for tool calls |
| `config.ts` | MCP server configuration |
| `lifecycle.ts` | Server start/stop lifecycle |

The `extensions/ephemeral/` directory contains a separate ephemeral patching system:

| File | Purpose |
|------|---------|
| `index.ts` | Entry point |
| `catalog.ts` | Patch catalog |
| `apply.ts` | Patch application logic |
| `project-state.ts` | Tracks project patch state |
| `ui.ts` | TUI for browsing/applying patches |
| `manifest.ts` | Patch manifest types |

---

## Themes

Custom themes live in `themes/`. The current theme is `gruvbox-dark-hard` (a Gruvbox dark variant with hard contrast).

---

## File Layout

```
~/.pi/agent/
├── settings.json          # Main configuration
├── .env                   # API keys (gitignored)
├── .env.example           # Template for .env
├── .gitignore             # Ignores sessions, auth, .env, node_modules
├── AGENTS.md              # Coding standards for agent-assisted work
├── README.md              # This file
├── package.json           # NPM dependencies
├── pnpm-lock.yaml         # Lock file
├── assets/
│   └── preview-maky.png   # Preview screenshot
├── extensions/
│   ├── firecrawl-search.ts
│   ├── diff.ts
│   ├── copy-all.ts
│   ├── flow-title.ts
│   ├── git-status-widget.ts
│   ├── tps-tracker.ts
│   ├── openai-codex-fast-mode.ts
│   ├── update.ts
│   ├── usage.ts
│   ├── yeet.ts
│   ├── lg.ts
│   ├── zsh-user-bash.ts
│   ├── herdr-agent-state.ts
│   ├── ephemeral/         # Ephemeral patching system
│   └── pi-mcp/            # MCP adapter with OAuth
│       ├── package.json
│       ├── cli.js
│       └── src/           # MCP source files
├── themes/                # Custom UI themes
├── sessions/              # Session storage (gitignored)
└── npm/                   # NPM cache (gitignored)
```

---

## License

This is a personal configuration reference. No license is attached — use it as inspiration for your own Pi setup.

## Credits

- [Pi](https://pi.dev) by Mario Zechner
- [Firecrawl](https://firecrawl.dev) for web search
- [Herdr](https://herdr.dev) for agent state management
- [models.dev](https://models.dev) for pricing data
