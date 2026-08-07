# web-tools

Pi extension that registers the local `webfetch` tool. Web search is provided separately by the pinned `pi-web-access` package using the direct Exa API.

## `webfetch`

Parameters:

- `url` — required
- `format` — optional: `markdown`, `text`, `html`
- `timeout` — optional timeout in seconds, clamped to `1..120`

Current defaults:

- `defaultFormat`: `markdown`
- `timeoutSeconds`: `30`
- `maxResponseBytes`: `5 MB`
- `blockPrivateHosts`: `true`
- `maxRedirects`: `5`
- `fallbackUserAgent`: `opencode`

Behavior notes:

- only `http://` and `https://` URLs are supported
- URL userinfo credentials (`https://user:pass@example.com`) are rejected and redacted in diagnostics
- private/local hosts and IPs are blocked by default
- raster images (`png`, `jpeg`, `gif`, `webp`) are returned inline as images
- HTML is converted to Markdown or text when requested
- binary content is rejected
- if a site returns `403` with `cf-mitigated: challenge`, the tool retries with the fallback user agent

## Web search

The pinned `pi-web-access` package supplies `web_search`, `source_check`, `fetch_content`, and `get_search_content`. The former local MCP search implementation has been removed.

Its configuration lives at `~/.pi/web-search.json` and selects Exa with `exaApiKey: "$EXA_API_KEY"`, which forces the direct Exa API whenever the environment variable is available.

## Source of truth

- extension entry: `home/.pi/agent/extensions/web-tools/index.ts`
- settings/defaults: `home/.pi/agent/extensions/web-tools/settings.ts`
- fetch Pi adapter: `home/.pi/agent/extensions/web-tools/webfetch.ts`
- fetch service: `home/.pi/agent/extensions/web-tools/fetch-page.ts`
- public web adapter: `home/.pi/agent/extensions/web-tools/network.ts`
