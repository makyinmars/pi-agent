import { FooterComponent, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

const SERVICE_TIER = "priority";
const FAST_MODE_EMOJI = "🏎️";
const OPENAI_CODEX_PROVIDER = "openai-codex";
const OPENAI_CODEX_RESPONSES_API = "openai-codex-responses";
const FOOTER_PATCH_KEY = "__openaiCodexFastModeOriginalRender";

type ModelIdentity = {
  id: string;
  provider: string;
  api?: string;
};

type PatchedFooterPrototype = typeof FooterComponent.prototype & {
  [FOOTER_PATCH_KEY]?: typeof FooterComponent.prototype.render;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOpenAICodexResponsesPayload(payload: unknown): payload is Record<string, unknown> {
  if (!isRecord(payload)) return false;

  const model = payload.model;
  if (typeof model === "string" && model.toLowerCase().includes("codex")) return true;

  // Pi's OpenAI Codex Responses payload has this shape. This catches Codex-provider
  // requests even if a non-codex model id is routed through that provider.
  return (
    payload.stream === true &&
    typeof payload.instructions === "string" &&
    Array.isArray(payload.input) &&
    payload.tool_choice === "auto" &&
    "prompt_cache_key" in payload
  );
}

function isPriorityEnabledForModel(model: ModelIdentity | undefined): model is ModelIdentity {
  if (!model) return false;

  return (
    model.provider === OPENAI_CODEX_PROVIDER ||
    model.api === OPENAI_CODEX_RESPONSES_API ||
    model.id.toLowerCase().includes("codex")
  );
}

function getFooterModel(footer: unknown): ModelIdentity | undefined {
  if (!isRecord(footer)) return undefined;

  const session = footer.session;
  if (!isRecord(session)) return undefined;

  const state = session.state;
  if (!isRecord(state)) return undefined;

  const model = state.model;
  if (!isRecord(model)) return undefined;

  const { id, provider, api } = model;
  if (typeof id !== "string" || typeof provider !== "string") return undefined;

  return {
    id,
    provider,
    api: typeof api === "string" ? api : undefined,
  };
}

function removePaddingBefore(line: string, token: string, columns: number) {
  const tokenIndex = line.indexOf(token);
  if (tokenIndex <= 0 || columns <= 0) return line;

  let start = tokenIndex;
  let remaining = columns;

  while (start > 0 && remaining > 0 && line[start - 1] === " ") {
    start -= 1;
    remaining -= 1;
  }

  if (start === tokenIndex) return line;
  return line.slice(0, start) + line.slice(tokenIndex);
}

function replaceAndFit(line: string, oldText: string, newText: string, width: number) {
  if (!line.includes(oldText) || line.includes(newText)) return line;

  const extraWidth = visibleWidth(newText) - visibleWidth(oldText);
  const replaced = line.replace(oldText, newText);
  const compacted = extraWidth > 0 ? removePaddingBefore(replaced, newText, extraWidth) : replaced;

  if (visibleWidth(compacted) <= width) return compacted;
  return truncateToWidth(compacted, width, "");
}

function addFastModeIndicator(lines: string[], model: ModelIdentity, width: number) {
  if (lines.length === 0) return lines;

  const modelLineIndex = lines.length > 1 ? 1 : 0;
  const line = lines[modelLineIndex];
  if (!line) return lines;

  const provider = `(${model.provider})`;
  const providerWithEmoji = `(${model.provider} ${FAST_MODE_EMOJI})`;
  let updatedLine = replaceAndFit(line, provider, providerWithEmoji, width);

  if (updatedLine === line) {
    updatedLine = replaceAndFit(line, model.id, `${FAST_MODE_EMOJI} ${model.id}`, width);
  }

  if (updatedLine === line) return lines;

  const updatedLines = [...lines];
  updatedLines[modelLineIndex] = updatedLine;
  return updatedLines;
}

function patchFooterFastModeIndicator() {
  const prototype = FooterComponent.prototype as PatchedFooterPrototype;
  const originalRender = prototype[FOOTER_PATCH_KEY] ?? prototype.render;
  prototype[FOOTER_PATCH_KEY] = originalRender;

  const renderWithFastModeIndicator = function (this: FooterComponent, width: number) {
    const lines = originalRender.call(this, width);
    const model = getFooterModel(this);

    if (!isPriorityEnabledForModel(model)) return lines;
    return addFastModeIndicator(lines, model, width);
  };

  prototype.render = renderWithFastModeIndicator;

  return () => {
    if (prototype.render !== renderWithFastModeIndicator) return;

    prototype.render = originalRender;
    delete prototype[FOOTER_PATCH_KEY];
  };
}

export default function (pi: ExtensionAPI) {
  const restoreFooter = patchFooterFastModeIndicator();

  pi.on("session_shutdown", () => {
    restoreFooter();
  });

  pi.on("before_provider_request", (event) => {
    if (!isOpenAICodexResponsesPayload(event.payload)) return;

    return {
      ...event.payload,
      service_tier: SERVICE_TIER,
    };
  });
}
