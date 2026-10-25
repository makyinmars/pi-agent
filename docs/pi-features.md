# Pi 1.4 feature guide

This setup targets Pi 1.4.0 with codemode and tool search enabled, plus pinned `pi-web-access@0.44.0`.
It does not configure a local server, Claude Haiku 5.5, or an additional classifier/image provider.
Run `/reload` after changes to extensions or configuration. Restart Pi after upgrading the CLI itself.

## Changes since Pi 1.1

- **Configuration schemas (1.2):** `settings.json` and the Gruvbox theme now reference Pi’s published schemas at `https://pi.dev/schemas/`. Theme validation is strict at startup, not just reload; reusable colors belong under `vars`.
- **Extension-triggered runs (1.2):** `before_agent_start` also fires for custom-message runs. Handlers that need `event.prompt` must first check `event.messageType === "user"`. This setup’s existing handlers do not depend on that field.
- **Session tools (1.3–1.4):** resumed sessions retain their active tools, and newly installed extension tools are restored correctly. `--tools +name,-name` modifies the resumed selection; a plain-name list replaces it.
- **Codex (1.3–1.4):** `gpt-6.1-sol` has a 500K context window. Pi removed unavailable Codex `gpt-5.5`; `/answer` now selects `gpt-6.1-sol` and uses the authenticated model runtime instead of legacy compatibility helpers. Haiku 4.5 remains the credential fallback.
- **Compaction (1.4):** summaries use the model’s output limit. `compaction.reserveTokens` still controls when compaction starts; it is not a summary-output cap. No custom continuation extension or budget override is needed.
- **Codemode workers (1.4):** scripts wait up to 60 seconds for a free worker instead of failing immediately. The default pool remains two; leave it alone unless there is measured contention. `PI_CODEMODE_MAX_WORKERS` can raise it.
- **Image classifiers (1.4):** `models.classify()` supports images with compatible Jev/Clef providers. This is optional and still requires that provider’s credentials; this setup does not add any.

Pi also fixes concurrent TUI dialogs, terminal teardown, truncated-response recovery, and prompt-cache handling. No additional extension is needed for these fixes.

## Update without losing reproducibility

```sh
pi update --all
pi update --models
```

Versioned npm packages remain pinned. To advance web access, review a release and explicitly install it with `pi install npm:pi-web-access@<version>`; `pi update --all` alone does not change `0.44.0`. Update this repository’s development dependencies and lockfiles alongside Pi, then run `pnpm run check`.

The checks now load all local extensions and the custom theme through Pi’s resource loader and exercise `/answer` selection and mode guards offline. They do not send prompts, mutate credentials, or persist sessions.

Local dependency audits are clean after patching transitive dependencies. The separately installed Pi 1.4.0 CLI still pins `undici@8.10.2`, affected by current advisories; repository overrides cannot patch that installation. See the [verification notes](../README.md#verification).

## Terminal status

Pi sends status reports to terminals that support OSC 7501, a protocol for reporting application state.
The states are `idle`, `working`, `blocked`, `done`, and `error`.
Pi automatically asks the terminal whether it supports this protocol.
No extension or setting is required.

Start Pi and send a request.
A compatible terminal or dashboard can display the state as the request progresses.
An unsupported terminal will not display these reports.
The existing `terminal.showTerminalProgress` setting also enables progress reports through OSC 9;4.
These are separate protocols.

If a terminal supports OSC 7501 but its capability query fails, start Pi with:

```sh
PI_PROGRAM_STATUS=1 pi
```

Do not force this on an unsupported terminal.
Unsupported escape sequences can corrupt rendering.
To disable reports for one launch, use `PI_PROGRAM_STATUS=0 pi`.
Pi does not forward these reports through tmux or screen.

## Adjust the tools for one launch

These commands run in your shell, not in the Pi prompt:

```sh
# Keep your default tools and add file search.
pi --tools +grep,+find,+ls

# Keep other default tools but disable edit and write.
pi --tools -edit,-write

# Disable all MCP connections for this launch.
pi --no-mcp

# Keep default tools but exclude all MCP tools by pattern.
pi --exclude-tools 'mcp__*'

# Declare file reading and codemode, plus only OpenAI Docs MCP tools.
pi --tools read,codemode,'mcp__openai_docs__*'
```

A list containing only `+name` and `-name` changes your default selection.
A list of plain names replaces the selection.
Do not mix the two forms.
Quote wildcard patterns so the shell does not expand them.
Use `--exclude-tools` for wildcard exclusions.

Disabling `edit` and `write` does not create a read-only sandbox.
Bash commands and other tools can still change files.
For a restricted review session without shell execution or discovered extensions, use:

```sh
pi --no-extensions --no-mcp --tools read,grep,find,ls
```

## Save images from codemode

Codemode is a tool that runs JavaScript to call other tools.
It is enabled in your `settings.json`.
Ask Pi:

```text
Use codemode to read assets/void.png, display it with image(),
and tell me the saved temporary file path.
```

The corresponding script is:

```js
const picture = await tools.read({ path: "assets/void.png" });
image(picture);
```

`image()` saves the image to a temporary file and reports its path.
Ask Pi to copy that file to a permanent location if you want to keep it.
This also works for images returned by MCP tools.
Generating a new image still requires an available image model and its credentials.
This change does not add credentials or configure an image model.

## Override MCP in one project

MCP lets Pi call tools from external services.
Your global configuration contains `openai-docs` and a disabled `paper` server.
To change a server only for a project:

1. Start Pi in the project directory.
2. Run `/mcp`.
3. Select the server.
4. Select "Disable in this project" or "Enable in this project".

Pi saves a project override in `.pi/mcp.json` after you grant project trust.
A minimal override can disable OpenAI Docs without copying its URL or credentials:

```json
{
  "mcpServers": {
    "openai-docs": {
      "enabled": false
    }
  }
}
```

If you edit the file outside Pi, run `/reload`.
Remove the override to inherit the global configuration again.
Do not enable `paper` unless the Paper app is running and you want its local connection.
This update leaves that server disabled.

## See tool execution time

Pi records tool execution durations.
Built-in shell tools display their recorded time.
Your custom `webfetch` renderer now uses Pi's recorded duration too.
It displays a suffix such as `Took 1.25s` after a completed fetch.

Ask Pi:

```text
Fetch https://pi.dev as Markdown with webfetch.
```

Use `Ctrl+O` to expand tool output.
The recorded duration is available when Pi renders a saved result after reloading the session.
If an older result has no recorded duration, the renderer omits the suffix.

Extensions receive `durationMs` on `tool_execution_end` events and in their tool render context.
This API is available without another extension.

## Sampling by thinking level

Sampling controls such as `temperature` change how a model chooses output tokens.
Pi supports `samplingParamsByThinkingLevel` for `openai-completions`, `openai-responses`, and `azure-openai-responses` APIs.
Your current provider uses `openai-codex-responses`, which ignores these settings.
This setup does not add ineffective overrides or switch your provider.

For a supported API, place overrides in `~/.pi/agent/models.json` under a model's `samplingParamsByThinkingLevel`.
Use Pi levels such as `off`, `medium`, and `high` as the keys.
Only use parameters that the selected model accepts.
See the [official sampling documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/models.md#configure-sampling-by-thinking-level).

## Make sure that the setup works

Run the checks from the configuration repository:

```sh
cd ~/.pi/agent
pnpm run check
pi --offline --list-models >/dev/null
```

These commands do not send a model prompt or generate an image. The root tests perform real extension/theme loading; `--list-models` checks only model-catalog startup.
Terminal status display requires a compatible terminal.
Network fetches and MCP connections require a reachable service.

## References

- [Pi 1.2 release](https://github.com/earendil-works/pi/releases/tag/v1.2.0)
- [Pi 1.3 release](https://github.com/earendil-works/pi/releases/tag/v1.3.0)
- [Pi 1.4 release](https://github.com/earendil-works/pi/releases/tag/v1.4.0)
- [Settings schemas and reference](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md)
- [Terminal status](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/terminal-setup.md#program-status)
- [Tool selection](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#tools)
- [Codemode images](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/codemode.md)
- [Project MCP overrides](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md#configure-servers)
- [Extension APIs](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)
