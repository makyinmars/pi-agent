# Can a Pi extension expose or reproduce OpenAI Codex “computer use”?

**Research date:** 2026-07-24  
**Scope:** Primary sources only: Pi's official docs/repository/source and OpenAI's official docs/repository/source. The local workspace had no research-note convention, so this note uses the requested fallback path.

## Conclusion

**Yes. On this Mac, a Pi extension can use the actual installed Codex Computer Use runtime, and a direct read-only probe succeeded.** It cannot launch the plugin's MCP helper directly: a normal MCP client can initialize it and list its tools, but `list_apps` fails with `Computer Use server error -10000: Sender process is not authenticated`. The helper requires an OpenAI-signed parent process (Team ID `2DC432GLL2`).

The working bridge is:

```text
Pi extension
  -> signed `codex app-server`
  -> app-server `mcpServer/tool/call`
  -> OpenAI's configured `node_repl.js`
  -> installed plugin wrapper `setupComputerUseRuntime()`
  -> `@oai/sky`
  -> signed Codex Computer Use service
```

This route needed no Codex model turn. An idle ephemeral App Server thread directly loaded the installed wrapper and called `sky.list_apps()`, which returned `{ "directIdleSuccess": true, "count": 20 }`; app names were deliberately not emitted. A second direct call on the persistent REPL also succeeded. Pi can therefore register typed tools around `sky.list_apps`, `get_app_state`, `click`, `drag`, `press_key`, `scroll`, `select_text`, `set_value`, `type_text`, and `perform_secondary_action`, and can return `get_app_state` screenshots as Pi image content.

This is a **validated but unsupported/private-runtime integration**, not a published standalone Computer Use API. The bundle is proprietary, versioned, macOS-only, and tied to OpenAI-signed ChatGPT/Codex components. Paths and private `@oai/sky` behavior may change. The extension should discover the installed plugin and Node REPL configuration through Codex commands rather than copy files or hard-code the current cache paths.

Separately, a Pi extension can reproduce the capability through OpenAI's supported public Computer tool. The cleanest portable prototype is a Pi custom tool that owns an isolated Playwright browser and either:

1. calls the OpenAI **Responses API** with `tools: [{ type: "computer" }]`, executes each returned action, captures a screenshot, sends `computer_call_output`, and repeats; or
2. skips the built-in Computer tool and exposes Pi-native Playwright actions plus screenshots as ordinary Pi tools.

Architecture 1 most closely reproduces the official visual, coordinate-based Computer-use loop. Architecture 3 is smaller if “browser control” rather than exact Responses Computer-tool semantics is the goal. Both are expressly supported harness shapes in OpenAI's Computer-use guide: built-in Computer, custom tool/harness, and code-execution harness ([OpenAI Computer use](https://developers.openai.com/api/docs/guides/tools-computer-use)).

## Terminology: three different things

| Term | What it means | Reusable from Pi? |
|---|---|---|
| **ChatGPT desktop/Codex app “Computer Use”** | A desktop feature on supported macOS/Windows regions. Installed in ChatGPT desktop under Plugins; shown as one MCP server plus one skill. It sees and operates allowed apps using Screen Recording + Accessibility on macOS and foreground UI on Windows. | **Locally validated on macOS through signed `codex app-server` + `node_repl`; not a documented standalone integration contract.** Direct launch from Pi fails sender-process authentication. ([docs](https://learn.chatgpt.com/docs/computer-use)) |
| **Responses API `computer` tool** | A first-party model tool that emits structured UI actions; the developer supplies the browser/VM, executes actions, captures screenshots, and continues the Responses loop. | **Yes.** A Pi extension is ordinary TypeScript with network/process access and custom tools, so it can be the client and harness. ([docs](https://developers.openai.com/api/docs/guides/tools-computer-use), [API overview](https://developers.openai.com/api/reference/responses/overview/)) |
| **Codex/Pi plugin or skill** | A skill is reusable instructions/resources; a plugin can bundle skills and integrations. These are packaging/orchestration mechanisms, not themselves a mouse/screenshot runtime. OpenAI's public “OpenAI Developers plugin,” for example, provides Platform/API setup guidance and docs access, not Computer Use. | A Pi skill could teach use of Pi tools, and a Pi package could bundle an extension and skill. It cannot conjure the desktop plugin's private runtime. ([OpenAI Developers plugin](https://developers.openai.com/learn/developers-codex-plugin), [Pi overview](https://pi.dev/)) |

“Computer environment” can also mean a hosted shell/container rather than GUI control. OpenAI explicitly describes models as proposing tool calls while an orchestrator executes them; its shell/container/skills architecture is distinct from the screenshot-and-pointer Computer tool ([OpenAI engineering article](https://openai.com/index/equip-responses-api-computer-environment/)).

## Pi extension surface available to implement this

Pi extensions are TypeScript default-export factory functions loaded with `jiti`. They can register tools, commands, event handlers, UI, providers, and invoke processes ([Pi extension docs](https://pi.dev/docs/latest/extensions); official source: [`packages/coding-agent/src/core/extensions/types.ts`, `ToolDefinition`, `ExtensionContext`, `ExtensionAPI`, `ProviderConfig`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts)). Relevant exact contracts are:

- `ExtensionAPI.registerTool()` registers a TypeBox-schema tool. `ToolDefinition.execute(toolCallId, params, signal, onUpdate, ctx)` returns an `AgentToolResult`; this is enough to expose `computer_task`, `browser_click`, `browser_screenshot`, or a persistent code-execution tool. See the official [custom-tool documentation](https://pi.dev/docs/latest/extensions) and source symbol `ToolDefinition` above.
- Tool results and updates can contain images. Official source defines `ImageContent` as `{ type: "image"; data: string; mimeType: string }`, and `ToolResultMessage.content` as `(TextContent | ImageContent)[]` in [`packages/ai/src/types.ts`, `ImageContent`, `ToolResultMessage`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts). The extension source's `ToolResultEventBase.content` and `ToolResultEventResult.content` preserve those image types in `packages/coding-agent/src/core/extensions/types.ts`. Thus a Pi-native screenshot tool can return PNG base64 directly to a vision-capable model.
- `ExtensionAPI.exec(command, args, options)` can launch a browser helper/container or OS automation process; the official docs define `stdout`, `stderr`, `code`, cancellation, and timeout behavior ([Pi extension docs, `pi.exec`](https://pi.dev/docs/latest/extensions)). Direct Node dependencies may also be used because extensions are executable TypeScript; Pi warns that packages/extensions run with full system access ([Pi coding-agent README, “Pi Packages” security note](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md)).
- `ctx.ui.confirm`, `ctx.ui.select`, `ctx.ui.input`, and notifications permit action-time consent gates in interactive mode. `ctx.hasUI` distinguishes print/RPC mode. See `ExtensionContext`/`ExtensionUIContext` in the same official `types.ts` source and [extension docs](https://pi.dev/docs/latest/extensions).
- `tool_call` handlers can block execution (`ToolCallEventResult.block/reason`), making centralized domain/action policy possible. The official permission-gate pattern is documented in [extensions.md](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md) and implemented in [`packages/coding-agent/examples/extensions/permission-gate.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/permission-gate.ts).
- `before_provider_request` receives the outgoing provider `payload` and may replace it (`BeforeProviderRequestEvent` / `BeforeProviderRequestEventResult` in `packages/coding-agent/src/core/extensions/types.ts`). This is useful for ordinary payload tweaks, as this workspace already does in `extensions/openai-codex-fast-mode.ts` (`isOpenAICodexResponsesPayload`, default extension factory), but it is **not sufficient by itself** to add Computer use: Pi's normal agent protocol must also parse `computer_call` output and send `computer_call_output`, which its generic `ToolCall`/`ToolResultMessage` abstraction does not model as a first-class type. A self-contained nested Responses loop avoids depending on undocumented payload/parser behavior.
- `registerProvider()` supports custom base URL, API type (`openai-responses` included), headers, API-key resolution, OAuth, model definitions, or a complete `streamSimple` implementation. That permits a deep integration, but a nested API client inside one registered Pi tool is much smaller. See [`ProviderConfig`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) and [custom-provider docs](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/custom-provider.md).

The local extension patterns confirm these public contracts without needing changes: `extensions/firecrawl-search.ts` (default factory, `createClient`, two `registerTool` calls); `extensions/openai-codex-fast-mode.ts` (`before_provider_request`); and `extensions/pi-mcp/src/tool-registrar.ts` (`transformMcpContent`, including image conversion). No local extension implements Playwright, screenshots, or general computer control.

## Architecture 1 — Pi tool directly invokes the official OpenAI Computer API

### Execution loop and primitives

The extension should own a persistent isolated browser/page (or VM adapter) and a dedicated Responses conversation:

1. Create an OpenAI response with a supported model and `tools: [{ type: "computer" }]`.
2. Find the returned `computer_call`. A screenshot-first call is normal.
3. Execute **every** item in its batched `actions[]`, in order.
4. Capture the resulting full UI as PNG.
5. Create the next response with `previous_response_id` and an input item `{ type: "computer_call_output", call_id, output: { type: "computer_screenshot", image_url: "data:image/png;base64,...", detail: "original" } }`.
6. Repeat until no `computer_call` remains, then return the final model output to Pi.

This exact loop and request shape are normative in [OpenAI's Computer-use guide](https://developers.openai.com/api/docs/guides/tools-computer-use). The current documented actions are `click`, `double_click`, `scroll`, `type`, `wait`, `keypress`, `drag`, `move`, and `screenshot`; mouse actions may carry held modifier `keys`. The client must normalize key names and coordinate/button conventions. The official guide includes both Playwright and Docker/desktop handlers.

For screenshots, OpenAI recommends `detail: "original"` for click accuracy. If downscaling to control token use, the harness must map generated coordinates back to the original coordinate space; OpenAI reports strong performance around 1440×900 or 1600×900 ([same guide](https://developers.openai.com/api/docs/guides/tools-computer-use)).

The old `computer-use-preview` / `computer_use_preview` shape is deprecated. New work should use the GA `computer` tool and batched `actions[]`; the guide's migration table documents the old single-action/display-dimension/truncation shape ([migration section](https://developers.openai.com/api/docs/guides/tools-computer-use#migration-from-computer-use-preview)).

### Authentication/API requirements

- This path is an **OpenAI Platform Responses API** integration and should use a project API key such as `OPENAI_API_KEY`, an API project with access to the documented model/tool, and API billing. The official examples instantiate `new OpenAI()` / `OpenAI()` and the general tools documentation shows `OPENAI_API_KEY`-backed API clients ([Using tools](https://developers.openai.com/api/docs/guides/tools), [Computer use](https://developers.openai.com/api/docs/guides/tools-computer-use)).
- A ChatGPT/Codex subscription login is a different credential/product route. Codex officially supports “Sign in with ChatGPT” or API-key setup ([openai/codex README](https://github.com/openai/codex#using-codex-with-your-chatgpt-plan)); this does **not** document Pi's stored `openai-codex` OAuth access token as authorization for arbitrary Platform Responses API Computer calls. Do not reuse or extract that token. Require a separately configured `OPENAI_API_KEY` unless OpenAI later documents delegated Platform API access.
- Pi's own model auth can come from stored credentials or environment variables, but a nested client should make its requirement explicit rather than silently coupling to Pi internals ([Pi SDK auth resolution](https://pi.dev/docs/latest/sdk)).

### Benefits and blockers

**Benefits:** exact official Computer-tool semantics; OpenAI-trained screenshot/action loop; no need to make Pi's outer model learn a custom coordinate schema.  
**Hard requirements:** API access/billing, supported model, OpenAI SDK or direct HTTP client, persistent browser/VM, action dispatcher, screenshots, cancellation/timeouts, and a complete consent/policy layer.  
**Integration blocker:** simply injecting `{type:"computer"}` via `before_provider_request` is unsafe/incomplete because Pi does not expose documented first-class `computer_call` parsing/output APIs. Keep this as a nested loop unless implementing/maintaining a custom Pi provider stream adapter.

## Architecture 2 — validated bridge to the installed Codex Computer Use runtime

### What is installed

`codex plugin list --json` reports `computer-use@openai-bundled` version `1.0.1000451` installed and enabled. Its discovered plugin root contains:

- a proprietary plugin manifest and Computer Use skill;
- `.mcp.json`, which launches the signed `SkyComputerUseClient` executable with argument `mcp`;
- `scripts/computer-use-client.mjs`, which loads the private `@oai/sky` macOS client from the Node REPL runtime; and
- signed `Codex Computer Use.app` and nested `SkyComputerUseClient.app` bundles.

The helper's `SkyComputerUseClient_Parent.coderequirement` plist requires Team ID `2DC432GLL2`. The installed Homebrew Codex CLI, Computer Use app, and helper are all Developer ID signed by OpenAI with that team. This explains the observed split:

- Pi's MCP SDK can initialize the helper and enumerate its ten tools, proving that the outer transport is normal MCP.
- The same direct client receives `Sender process is not authenticated` when invoking `list_apps`, because its parent is Node/Pi rather than an OpenAI-signed process.
- `codex app-server` can host the route successfully because the relevant Codex/ChatGPT runtime processes satisfy the signed-parent requirement.

### Working no-model protocol

OpenAI documents App Server as the supported rich-client embedding surface for Codex generally ([App Server docs](https://learn.chatgpt.com/docs/app-server), [source README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)). The Computer Use bridge itself remains undocumented, but it works through standard published App Server requests:

1. Discover prerequisites with `codex plugin list --json` and `codex mcp get node_repl --json`.
2. Spawn `codex app-server` over JSONL stdio.
3. Send `initialize`, wait for its response, then send the `initialized` notification.
4. Send `thread/start` with `ephemeral: true` and retain the returned thread ID.
5. Send `mcpServer/tool/call` with `server: "node_repl"`, `tool: "js"`, and JavaScript that imports the discovered plugin's `scripts/computer-use-client.mjs`, calls `setupComputerUseRuntime({ globals: globalThis })`, and stores `sky` in the persistent REPL.
6. In the same call or later direct `node_repl.js` calls, invoke only fixed, typed `sky` operations.

No `turn/start` or Codex model invocation was needed in the successful final probe. The current `node_repl` configuration already supplies:

- an OpenAI-bundled signed REPL executable;
- `NODE_REPL_NODE_MODULE_DIRS` pointing to ChatGPT's `cua_node` modules;
- `SKY_CUA_SERVICE_PATH` pointing to the versioned installed Computer Use service; and
- the other trusted-runtime settings required by `@oai/sky`.

The first idle-thread probe returned `{ "directIdleSuccess": true, "count": 20 }`. A subsequent direct call using the same persistent REPL returned `{ "directSuccess": true, "count": 20 }`. Names were suppressed, and no UI action was performed. The `computer-use` MCP server does not appear as directly callable in App Server's thread catalog; the working route is the configured `node_repl` server plus the plugin-owned wrapper.

### Pi extension shape

The extension should not expose arbitrary JavaScript. It should register typed operations and generate fixed JavaScript internally with JSON-encoded arguments:

- read operations: `list_apps`, `get_app_state`;
- UI operations: click, drag, key press, scroll, select text, set value, type text, and secondary accessibility action;
- lifecycle: initialize once, reuse one ephemeral App Server thread/REPL per Pi session, cancel outstanding requests, and terminate the child process on shutdown.

For `get_app_state`, return the accessibility text plus the PNG at the returned `file://` screenshot URL as Pi `ImageContent`. Enforce the plugin's fresh-state rule: inspect state before interaction and after action batches rather than reusing stale element indexes.

### Support and maintenance boundary

This is technically viable but not portable or guaranteed:

- the plugin license is proprietary;
- OpenAI does not document `@oai/sky` or the bundle as a third-party API;
- the current marketplace/cache paths and version will change;
- it is macOS-specific and depends on ChatGPT/Codex installation, entitlements, and Accessibility/Screen Recording setup; and
- an unsigned or differently packaged Codex executable may fail the parent-signature check.

Use Codex's discovery commands and returned source/config paths; never vendor, patch, re-sign, or copy the proprietary bundle. Fail closed if the plugin, signed runtime, or expected Node REPL environment is missing. Keep the public Responses API Computer-tool implementation as the supported fallback.

## Architecture 3 — Pi-native browser or desktop control

### Browser control

Register a small set of Pi tools around a persistent Playwright context, for example:

- `browser_open({ url })`
- `browser_screenshot()` → Pi `ImageContent`
- `browser_click({ x, y })` and/or safer locator-based click
- `browser_type`, `browser_keypress`, `browser_scroll`
- optionally `browser_eval` or a constrained code-execution tool

This is directly aligned with OpenAI's custom-harness option. OpenAI says an existing Playwright, Selenium, VNC, or MCP harness can remain a normal tool interface, and that GPT-5.4+ is trained to work with custom/code-execution harnesses ([Computer use, options 2–3](https://developers.openai.com/api/docs/guides/tools-computer-use)). It also recommends Playwright as the fastest local prototype and launches Chromium with `chromiumSandbox: true`, empty inherited environment, disabled extensions, and disabled filesystem access ([safe-environment section](https://developers.openai.com/api/docs/guides/tools-computer-use#prepare-a-safe-environment)).

This avoids a second OpenAI API loop and can use whichever vision-capable model Pi already runs. It is not identical to the Responses `computer` tool: Pi sends ordinary function tools and image results, so reliability depends on the selected model, prompts/tool schema, coordinate fidelity, and Pi provider's image support. Locator/DOM operations can be faster and safer than raw pixels but reproduce browser automation, not specifically Codex desktop Computer Use.

### Desktop control

The same Pi tool boundary can wrap a VM/VNC/OS adapter (for example, screenshot plus synthetic input). OpenAI's guide demonstrates Xvfb/x11vnc/xdotool in an isolated Docker desktop and recommends a VM/container for fuller environments ([Computer use](https://developers.openai.com/api/docs/guides/tools-computer-use)). Host desktop automation is higher risk and platform-specific:

- macOS requires Screen Recording to see apps and Accessibility to click/type;
- Windows Computer Use requires the active visible desktop and takes over foreground input;
- the official desktop feature adds per-app approvals and cannot approve administrator, security, or privacy prompts itself.

Those constraints are documented for OpenAI's product at [ChatGPT Computer Use](https://learn.chatgpt.com/docs/computer-use); a Pi-native equivalent must independently implement comparable permission boundaries. An isolated browser is therefore the appropriate first target.

## Safety requirements (not optional)

OpenAI's guidance requires the harness—not merely the model—to enforce safety ([Computer-use guide](https://developers.openai.com/api/docs/guides/tools-computer-use)):

- isolate the browser/VM; do not inherit host environment/secrets; disable extensions and filesystem access where possible;
- allow-list domains and actions, and block everything else;
- treat screenshots, pages, PDFs, email/chat, and tool output as untrusted; only direct user instructions convey permission;
- stop and ask if on-screen content resembles prompt injection, phishing, spam, or an unexpected warning;
- confirm **at action time** for destructive changes, permission/access changes, CAPTCHA, downloaded code/extensions, external communication/submission, subscriptions, financial transactions, local security/network/password changes, and medical actions;
- hand off to the human for final password changes and bypassing browser/site safety barriers;
- confirm before typing sensitive data because typing itself transmits it; identify what data, recipient, and purpose;
- keep a human present for purchases, authenticated, destructive, or hard-to-reverse flows.

For a Pi extension, implement these as checks inside the computer/browser executor—not only an outer `tool_call` hook—because one `computer_task` invocation may perform many nested actions. Use `ctx.ui.confirm` when UI exists; in print/RPC mode, stop and return a structured pending-confirmation result rather than auto-approve. Record the current URL/app, screenshot hash, proposed action, reason, and user's decision for auditability.

The ChatGPT desktop implementation adds app allow-lists, system permissions, sensitive/disruptive-action prompts, user takeover, and admin disablement. It cannot automate terminals/ChatGPT, elevate to administrator, or approve system security/privacy prompts ([ChatGPT Computer Use](https://learn.chatgpt.com/docs/computer-use)). A Pi implementation should adopt at least equally conservative boundaries.

## Smallest practical prototypes

### For the user's exact goal: typed Pi bridge to installed Codex Computer Use

Register a small typed Pi tool (or a few typed tools) backed by one long-lived `codex app-server` child:

```text
computer_use({ action, app, ...actionArgs })
  discover installed computer-use plugin and node_repl config
  verify required paths and signed Codex/ChatGPT runtime are available
  initialize app-server + ephemeral thread once per Pi session
  bootstrap plugin wrapper through direct mcpServer/tool/call -> node_repl.js
  validate action and confirmation policy
  execute fixed `sky` method call through node_repl.js
  return AX text, structured result, and screenshot image when present
```

This reuses the actual installed plugin, performs no second model inference, and was validated through `list_apps`. The prototype should start read-only with `list_apps` and `get_app_state`; add mutating UI actions only after action-time confirmations and cancellation work.

### Supported/portable alternative: one nested `computer_task` Pi tool + isolated Playwright

Create one extension tool, roughly:

```text
computer_task({ task, allowedDomains })
  require OPENAI_API_KEY
  launch/reuse isolated Chromium context (empty env, no extensions/filesystem)
  call Responses API with tools:[{type:"computer"}]
  while computer_call:
    validate URL/domain and each action
    request action-time confirmation when policy requires it
    execute batched actions in order
    capture PNG
    send computer_call_output with detail:"original"
  return final text + last screenshot as Pi ImageContent
```

Why this is smallest while preserving the named capability:

- one Pi-visible tool, so the nested model owns the low-level loop;
- official OpenAI action and screenshot protocol rather than an invented approximation;
- Playwright is the official guide's fastest prototype;
- Pi already supports custom tools, cancellation/progress, image tool results, process execution, and confirmation UI;
- no custom Pi provider/parser and no dependency on undocumented Codex desktop internals.

Prototype constraints: browser-only; fresh profile; one page/context; URL allow-list mandatory; no downloads/uploads, clipboard, credentials, payments, external submissions, or host filesystem; maximum steps/time; screenshot size fixed; visible stop/cancel; no headless production claim. Add an API package with the repository's required install command rather than editing `package.json` manually, or use direct `fetch` to avoid a dependency.

If the requirement is only “let Pi operate a test browser,” an even smaller proof is Architecture 3: `browser_screenshot`, `browser_click`, `browser_type`, and `browser_open` tools with a persistent isolated Playwright page. It avoids separate API credentials but is a custom harness, not proof that Pi can consume the first-party `computer` output protocol.

## Hard blockers and unresolved questions

1. **Private integration stability:** The local App Server/Node REPL bridge works, but OpenAI has not published the proprietary Computer Use bundle or `@oai/sky` as a supported third-party API. Any upgrade may change paths, method shapes, signing constraints, or availability.
2. **Platform and installation:** The validated path is macOS-specific and depends on the official signed Codex/ChatGPT runtime, installed/enabled Computer Use plugin, generated Node REPL configuration, entitlement, and OS Accessibility/Screen Recording permissions. Distribution to machines without that stack needs a separate prerequisite flow or the public API fallback.
3. **Direct MCP is blocked:** Pi cannot simply copy `.mcp.json` into `pi-mcp`; operational calls fail sender-process authentication. The signed App Server/Node REPL bridge is required on the tested installation.
4. **Path discovery:** Current paths include temporary/versioned plugin caches. Resolve them from `codex plugin list --json` and `codex mcp get node_repl --json`; do not hard-code the tested version or `~/.codex/.tmp` path.
5. **Entitlement/model availability for the public fallback:** OpenAI docs change model examples over time (`gpt-5.4`, `gpt-5.5`, and `gpt-5.6` appear in current guidance). A Responses API implementation must query/use a model enabled for the project and Computer tool; no Platform API call was made, so this account's API entitlement is unverified.
6. **Pi outer-provider native support for the public fallback:** Pi's generic public message types contain ordinary `ToolCall`, not Responses `computer_call`. A custom provider could translate it, but no official Pi abstraction specifically supports the Computer tool. The nested loop is therefore the stable public-API route.
7. **Credential separation:** Pi's ChatGPT/Codex OAuth login and Platform API-key billing are distinct documented setup paths. The local signed-runtime bridge does not establish that Codex OAuth can authorize arbitrary Platform Computer API calls; the public fallback should require `OPENAI_API_KEY`.
8. **Noninteractive confirmations:** Pi has no built-in global permission popup policy by design; extensions are expected to build gates ([Pi README philosophy](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md)). A production extension needs an explicit RPC/print-mode approval protocol before it can safely run unattended.

## Source index

### Pi (official)

- [Pi official site/architecture](https://pi.dev/)
- [Extensions documentation](https://pi.dev/docs/latest/extensions)
- [`packages/coding-agent/src/core/extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts): `ToolDefinition`, `ExtensionContext`, `BeforeProviderRequestEvent`, `ToolCallEventResult`, `ToolResultEventResult`, `ExtensionAPI`, `ProviderConfig`
- [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts): `ImageContent`, `ToolCall`, `ToolResultMessage`, `Model`
- [`packages/coding-agent/examples/extensions/permission-gate.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/permission-gate.ts)
- [Pi SDK/auth documentation](https://pi.dev/docs/latest/sdk)
- [Pi coding-agent README](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md)

### OpenAI (official)

- [Responses API Computer-use guide](https://developers.openai.com/api/docs/guides/tools-computer-use)
- [Responses API overview](https://developers.openai.com/api/reference/responses/overview/)
- [Responses API reference](https://developers.openai.com/api/reference/python/resources/responses/)
- [General tools guide](https://developers.openai.com/api/docs/guides/tools)
- [Official Computer-use sample app](https://github.com/openai/openai-cua-sample-app)
- [ChatGPT desktop/Codex Computer Use](https://learn.chatgpt.com/docs/computer-use)
- [Codex repository](https://github.com/openai/codex)
- [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [Codex App Server documentation](https://learn.chatgpt.com/docs/app-server)
- [Codex App Server source README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
- [Codex App Server/harness engineering article](https://openai.com/index/unlocking-the-codex-harness/)
- [OpenAI Developers plugin](https://developers.openai.com/learn/developers-codex-plugin)
- [Responses computer-environment architecture](https://openai.com/index/equip-responses-api-computer-environment/)
