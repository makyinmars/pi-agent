import assert from "node:assert/strict";
import { resolve } from "node:path";
import test, { type TestContext } from "node:test";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import {
  discoverAndLoadExtensions,
  ExtensionRunner,
  ModelRegistry,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";

const root = resolve(import.meta.dirname, "..");

async function createHarness(t: TestContext) {
  const runtime = await ModelRuntime.create({
    credentials: new InMemoryCredentialStore(),
    modelsPath: null,
    allowModelNetwork: false,
  });
  const registry = new ModelRegistry(runtime);
  const model = registry.find("openai-codex", "gpt-6.1-sol");
  assert.ok(model);
  const loaded = await discoverAndLoadExtensions([resolve(root, "extensions/answer.ts")], root, root);
  assert.deepEqual(loaded.errors, []);
  const manager = SessionManager.inMemory(root);
  manager.appendMessage({
    role: "assistant",
    content: [{ type: "text", text: "Which color?" }],
    api: model.api,
    provider: model.provider,
    model: model.id,
    stopReason: "stop",
    timestamp: Date.now(),
    usage: {
      input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
  });
  const runner = new ExtensionRunner(loaded.extensions, loaded.runtime, root, manager, registry);
  const notifications: string[] = [];
  const ui = {
    ...runner.getUIContext(),
    notify: (message: string) => { notifications.push(message); },
  };
  const dialog = t.mock.method(ui, "custom", async () => { throw new Error("extraction dialog opened"); });
  runner.setUIContext(ui, "tui");
  const context = runner.createCommandContext();
  Object.defineProperty(context, "model", { value: model });
  const command = runner.getCommand("answer");
  assert.ok(command);
  return { registry, notifications, context, command, dialog };
}

test("/answer selects the supported Codex model before opening extraction", async (t) => {
  const { registry, notifications, context, command, dialog } = await createHarness(t);
  t.mock.method(registry, "hasConfiguredAuth", () => true);
  const lookup = t.mock.method(registry, "find");
  await assert.rejects(command.handler("", context), /extraction dialog opened/);
  assert.deepEqual(lookup.mock.calls.map((call) => call.arguments), [["openai-codex", "gpt-6.1-sol"]]);
  assert.equal(dialog.mock.callCount(), 1);
  assert.deepEqual(notifications, []);
});

test("/answer falls back to Haiku when Codex has no configured credentials", async (t) => {
  const { registry, context, command, dialog } = await createHarness(t);
  t.mock.method(registry, "hasConfiguredAuth", (model: Parameters<typeof registry.hasConfiguredAuth>[0]) => model.provider === "anthropic");
  const lookup = t.mock.method(registry, "find");
  await assert.rejects(command.handler("", context), /extraction dialog opened/);
  assert.deepEqual(lookup.mock.calls.map((call) => call.arguments), [
    ["openai-codex", "gpt-6.1-sol"], ["anthropic", "claude-haiku-4-5"],
  ]);
  assert.equal(dialog.mock.callCount(), 1);
});

test("/answer rejects missing credentials without opening a dialog", async (t) => {
  const { registry, notifications, context, command, dialog } = await createHarness(t);
  t.mock.method(registry, "hasConfiguredAuth", () => false);
  await command.handler("", context);
  assert.equal(dialog.mock.callCount(), 0);
  assert.match(notifications[0]!, /No extraction model has configured credentials/);
});

test("/answer stays terminal-only in RPC mode", async (t) => {
  const { notifications, context, command, dialog } = await createHarness(t);
  Object.defineProperty(context, "mode", { value: "rpc" });
  await command.handler("", context);
  assert.equal(dialog.mock.callCount(), 0);
  assert.deepEqual(notifications, ["answer requires interactive mode"]);
});
