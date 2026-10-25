import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { DefaultResourceLoader, SettingsManager } from "@earendil-works/pi-coding-agent";

const root = resolve(import.meta.dirname, "..");

test("all local extensions and the custom theme load with the current Pi API", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "pi-resources-"));
  try {
    const loader = new DefaultResourceLoader({
      cwd,
      agentDir: root,
      settingsManager: SettingsManager.inMemory({ packages: [] }),
      noSkills: true,
      noPromptTemplates: true,
      noContextFiles: true,
    });
    await loader.reload();

    const loaded = loader.getExtensions();
    assert.deepEqual(loaded.errors, []);
    const entries = await readdir(join(root, "extensions"), { withFileTypes: true });
    assert.equal(loaded.extensions.length, entries.length, "every extension entry point should load");
    const commands = loaded.extensions.flatMap((extension) => [...extension.commands.keys()]);
    for (const command of ["answer", "fast", "save-md", "toggle-skills", "cloak-status", "diff"]) {
      assert.ok(commands.includes(command), `/${command} should be registered`);
    }
    const themes = loader.getThemes();
    assert.deepEqual(themes.diagnostics, []);
    assert.ok(themes.themes.some((theme) => theme.name === "gruvbox-dark-hard"));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
