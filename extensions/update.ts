import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

async function currentVersion(pi: ExtensionAPI) {
  const result = await pi.exec("pi", ["--version"], { timeout: 10_000 });
  return result.stdout.trim() || result.stderr.trim() || "unknown";
}

async function updatePi(pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  await ctx.waitForIdle();

  const before = await currentVersion(pi).catch(() => "unknown");
  ctx.ui.notify(`Updating Pi ${before} with the built-in updater...`, "info");

  const result = await pi.exec("pi", ["update"], { timeout: 300_000 });
  if (result.code !== 0) {
    ctx.ui.notify(result.stderr.trim() || result.stdout.trim() || "Pi update failed", "error");
    return;
  }

  const after = await currentVersion(pi).catch(() => "unknown");
  ctx.ui.notify(before === after ? `Pi is up to date (${after}).` : `Pi updated: ${before} → ${after}`, "info");
}

export default function (pi: ExtensionAPI) {
  pi.registerFlag("update", {
    description: "Update Pi with its built-in updater, then report the version change",
    type: "boolean",
    default: false,
  });

  pi.registerCommand("update", {
    description: "Update Pi with its built-in updater",
    handler: async (_args, ctx) => updatePi(pi, ctx),
  });

  pi.on("session_start", (_event, ctx) => {
    if (!pi.getFlag("update")) return;
    pi.sendUserMessage("/update", { deliverAs: "followUp", expandPromptTemplates: true });
    ctx.ui.notify("Queued /update from --update", "info");
  });
}
