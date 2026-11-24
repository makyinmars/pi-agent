import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRegistry,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

const extensionPath = resolve(import.meta.dirname, "../extensions/openai-codex-fast-mode.ts");

test("a fresh Sol 6.2 Codex session requests priority without overriding an explicit tier", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "pi-fast-mode-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const modelRuntime = await ModelRuntime.create({
    credentials: new InMemoryCredentialStore(),
    modelsPath: null,
    allowModelNetwork: false,
  });
  const settingsManager = SettingsManager.inMemory();
  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir: cwd,
    settingsManager,
    additionalExtensionPaths: [extensionPath],
    noSkills: true,
    noPromptTemplates: true,
    noContextFiles: true,
  });
  await resourceLoader.reload();
  assert.deepEqual(resourceLoader.getExtensions().errors, []);

  const model = new ModelRegistry(modelRuntime).find("openai-codex", "gpt-6.2-sol");
  assert.ok(model);
  const { session } = await createAgentSession({
    cwd,
    agentDir: cwd,
    model,
    modelRuntime,
    resourceLoader,
    settingsManager,
    sessionManager: SessionManager.inMemory(cwd),
  });
  t.after(() => session.dispose());
  await session.bindExtensions({});

  const payload = { model: model.id };
  assert.deepEqual(await session.extensionRunner.emitBeforeProviderRequest(payload), {
    ...payload,
    service_tier: "priority",
  });
  const explicit = { ...payload, service_tier: "default" };
  assert.deepEqual(await session.extensionRunner.emitBeforeProviderRequest(explicit), explicit);
});
