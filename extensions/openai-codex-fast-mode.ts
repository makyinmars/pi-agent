import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const SERVICE_TIER = "priority";
const OPENAI_CODEX_PROVIDER = "openai-codex";
const OPENAI_CODEX_RESPONSES_API = "openai-codex-responses";
const FAST_MODE_STATUS_KEY = "openai-codex-fast-mode";
const FAST_MODE_ENTRY_TYPE = "openai-codex-fast-mode";
const FAST_MODE_SHORTCUT = "ctrl+shift+f";
const FAST_MODE_INDICATOR = {
  frames: ["🏎️   ", "🏎️ 💨"],
  intervalMs: 180,
};

type FastMode = "on" | "off" | "auto";
type EnabledFastMode = Exclude<FastMode, "off">;
type ModelIdentity = {
  provider: string;
  api?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFastMode(value: unknown): value is FastMode {
  return value === "on" || value === "off" || value === "auto";
}

function isEnabledFastMode(value: unknown): value is EnabledFastMode {
  return value === "on" || value === "auto";
}

function isOpenAICodexModel(model: ModelIdentity | undefined) {
  return (
    model?.provider === OPENAI_CODEX_PROVIDER ||
    model?.api === OPENAI_CODEX_RESPONSES_API
  );
}

function describeMode(mode: FastMode) {
  switch (mode) {
    case "on":
      return "on — all Codex requests use priority";
    case "auto":
      return "auto — agent turns use priority; background summaries do not";
    case "off":
      return "off — provider defaults apply";
  }
}

export default function (pi: ExtensionAPI) {
  let mode: FastMode = "on";
  let lastEnabledMode: EnabledFastMode = "on";
  let agentActive = false;
  let ownsWorkingIndicator = false;

  function shouldUsePriority(ctx: ExtensionContext) {
    if (!isOpenAICodexModel(ctx.model) || mode === "off") return false;
    return mode === "on" || agentActive;
  }

  function updateFastModeUI(ctx: ExtensionContext) {
    if (ctx.mode !== "tui") return;

    const available = isOpenAICodexModel(ctx.model) && mode !== "off";
    const label = mode === "auto" ? "🏎️ AUTO" : "🏎️ FAST";
    ctx.ui.setStatus(
      FAST_MODE_STATUS_KEY,
      available ? ctx.ui.theme.fg("accent", label) : undefined,
    );

    if (shouldUsePriority(ctx)) {
      ctx.ui.setWorkingIndicator(FAST_MODE_INDICATOR);
      ownsWorkingIndicator = true;
    } else if (ownsWorkingIndicator) {
      ctx.ui.setWorkingIndicator();
      ownsWorkingIndicator = false;
    }
  }

  function restoreMode(ctx: ExtensionContext) {
    mode = "on";
    lastEnabledMode = "on";

    for (const entry of ctx.sessionManager.getBranch()) {
      if (
        entry.type !== "custom" ||
        entry.customType !== FAST_MODE_ENTRY_TYPE ||
        !isRecord(entry.data)
      ) {
        continue;
      }

      if (isFastMode(entry.data.mode)) mode = entry.data.mode;
      if (isEnabledFastMode(entry.data.lastEnabledMode)) {
        lastEnabledMode = entry.data.lastEnabledMode;
      } else if (isEnabledFastMode(mode)) {
        lastEnabledMode = mode;
      }
    }
  }

  function persistMode() {
    pi.appendEntry(FAST_MODE_ENTRY_TYPE, { mode, lastEnabledMode });
  }

  function setMode(nextMode: FastMode, ctx: ExtensionContext) {
    mode = nextMode;
    if (isEnabledFastMode(nextMode)) lastEnabledMode = nextMode;
    persistMode();
    updateFastModeUI(ctx);
    ctx.ui.notify(`Fast mode: ${describeMode(mode)}`, "info");
  }

  pi.on("session_start", (_event, ctx) => {
    agentActive = false;
    ownsWorkingIndicator = false;
    restoreMode(ctx);
    updateFastModeUI(ctx);
  });

  pi.on("session_tree", (_event, ctx) => {
    restoreMode(ctx);
    updateFastModeUI(ctx);
  });

  pi.on("agent_start", (_event, ctx) => {
    agentActive = true;
    updateFastModeUI(ctx);
  });

  pi.on("agent_end", (_event, ctx) => {
    agentActive = false;
    updateFastModeUI(ctx);
  });

  pi.on("model_select", (_event, ctx) => {
    updateFastModeUI(ctx);
  });

  pi.on("session_shutdown", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    ctx.ui.setStatus(FAST_MODE_STATUS_KEY, undefined);
    if (ownsWorkingIndicator) ctx.ui.setWorkingIndicator();
    ownsWorkingIndicator = false;
  });

  pi.on("before_provider_request", (event, ctx) => {
    if (
      !shouldUsePriority(ctx) ||
      !isRecord(event.payload) ||
      Object.hasOwn(event.payload, "service_tier")
    ) {
      return;
    }

    return {
      ...event.payload,
      service_tier: SERVICE_TIER,
    };
  });

  pi.registerCommand("fast", {
    description: "Set Codex fast mode: on, off, or auto",
    handler: async (args, ctx) => {
      const requestedMode = args.trim().toLowerCase();
      if (!requestedMode) {
        const availability = isOpenAICodexModel(ctx.model)
          ? "available for the current model"
          : "waiting for an OpenAI Codex model";
        ctx.ui.notify(`Fast mode: ${describeMode(mode)}; ${availability}`, "info");
        return;
      }

      if (!isFastMode(requestedMode)) {
        ctx.ui.notify("Usage: /fast [on|off|auto]", "error");
        return;
      }

      setMode(requestedMode, ctx);
    },
  });

  pi.registerShortcut(FAST_MODE_SHORTCUT, {
    description: "Toggle OpenAI Codex fast mode",
    handler: (ctx) => {
      setMode(mode === "off" ? lastEnabledMode : "off", ctx);
    },
  });
}
