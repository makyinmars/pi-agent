import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const STATUS_KEY = "subagent-review-mode";
const SHORTCUT = "ctrl+shift+r";
const INDICATOR = "🕵️‍♂️";
const SETTINGS_PATH = join(
  process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
  "settings.json",
);

type ReviewMode = "on" | "off";

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReviewMode(value: unknown): value is ReviewMode {
  return value === "on" || value === "off";
}

function readSettings() {
  const raw = readFileSync(SETTINGS_PATH, "utf8");
  const settings: unknown = JSON.parse(raw);
  if (!isRecord(settings)) throw new Error("settings.json must contain an object");
  return { raw, settings };
}

function getOrCreateObject(parent: JsonObject, key: string) {
  const current = parent[key];
  if (isRecord(current)) return current;
  if (current !== undefined) throw new Error(`${key} must be an object`);

  const created: JsonObject = {};
  parent[key] = created;
  return created;
}

function readMode(): ReviewMode {
  const { settings } = readSettings();
  if (!isRecord(settings.subagents)) return "off";
  if (!isRecord(settings.subagents.watchdog)) return "off";

  const watchdog = settings.subagents.watchdog;
  if (isRecord(watchdog.main) && typeof watchdog.main.enabled === "boolean") {
    return watchdog.main.enabled ? "on" : "off";
  }
  return watchdog.enabled === true ? "on" : "off";
}

function writeMode(mode: ReviewMode) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { raw, settings } = readSettings();
    const subagents = getOrCreateObject(settings, "subagents");
    const watchdog = getOrCreateObject(subagents, "watchdog");
    const main = getOrCreateObject(watchdog, "main");
    const enabled = mode === "on";

    watchdog.enabled = enabled;
    main.enabled = enabled;

    const temporaryPath = `${SETTINGS_PATH}.${process.pid}.${Date.now()}.tmp`;
    try {
      writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
      if (readFileSync(SETTINGS_PATH, "utf8") !== raw) continue;
      renameSync(temporaryPath, SETTINGS_PATH);
      return;
    } finally {
      rmSync(temporaryPath, { force: true });
    }
  }

  throw new Error("settings.json kept changing; try again");
}

export default function (pi: ExtensionAPI) {
  let mode: ReviewMode = "off";

  function updateUI(ctx: ExtensionContext) {
    if (ctx.mode !== "tui") return;
    ctx.ui.setStatus(
      STATUS_KEY,
      mode === "on" ? ctx.ui.theme.fg("accent", INDICATOR) : undefined,
    );
  }

  function restoreMode(ctx: ExtensionContext, notifyErrors = true) {
    try {
      mode = readMode();
      updateUI(ctx);
    } catch (error) {
      mode = "off";
      updateUI(ctx);
      if (!notifyErrors) return;

      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(`Could not read subagent review mode: ${message}`, "error");
    }
  }

  function setMode(nextMode: ReviewMode, ctx: ExtensionContext) {
    try {
      writeMode(nextMode);
      mode = nextMode;
      updateUI(ctx);
      ctx.ui.notify(`Subagent review: ${mode}`, "info");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(`Could not update subagent review mode: ${message}`, "error");
    }
  }

  pi.on("session_start", (_event, ctx) => {
    restoreMode(ctx);
  });

  pi.on("session_tree", (_event, ctx) => {
    restoreMode(ctx);
  });

  pi.on("message_end", (_event, ctx) => {
    restoreMode(ctx, false);
  });

  pi.on("session_shutdown", (_event, ctx) => {
    if (ctx.mode === "tui") ctx.ui.setStatus(STATUS_KEY, undefined);
  });

  pi.registerCommand("subagent-review", {
    description: "Toggle automatic subagent review of repository edits",
    handler: async (args, ctx) => {
      const requestedMode = args.trim().toLowerCase();

      if (!requestedMode) {
        restoreMode(ctx);
        ctx.ui.notify(`Subagent review: ${mode}`, "info");
        return;
      }

      if (!isReviewMode(requestedMode)) {
        ctx.ui.notify("Usage: /subagent-review [on|off]", "error");
        return;
      }

      setMode(requestedMode, ctx);
    },
  });

  pi.registerShortcut(SHORTCUT, {
    description: "Toggle automatic subagent review",
    handler: (ctx) => {
      restoreMode(ctx);
      setMode(mode === "on" ? "off" : "on", ctx);
    },
  });
}
