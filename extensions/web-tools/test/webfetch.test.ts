import test from "node:test";
import assert from "node:assert/strict";
import {
	createWebFetchTool,
	createWebFetchHeaders,
	getFallbackUserAgent,
	OPENCODE_WEBFETCH_DEFAULT_USER_AGENT,
	OPENCODE_WEBFETCH_FALLBACK_USER_AGENT,
	shouldRetryWithFallbackUserAgent,
} from "../webfetch.ts";

const renderTheme = {
	fg: (_name: string, value: string) => value,
	bold: (value: string) => value,
};

for (const isError of [false, true]) {
	test(`webfetch renders recorded duration for ${isError ? "failed" : "successful"} results`, () => {
		const tool = createWebFetchTool();
		const result = { content: [{ type: "text", text: "Response" }], isError };
		const rendered = tool.renderResult(result, { expanded: true, isPartial: false }, renderTheme, { durationMs: 1250 });
		assert.match(rendered.render(100).join("\n"), /Took 1\.25s/);
	});
}

test("webfetch omits timing for partial results and missing or invalid durations", () => {
	const tool = createWebFetchTool();
	const result = { content: [{ type: "text", text: "Response" }] };
	for (const durationMs of [undefined, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
		const rendered = tool.renderResult(result, { expanded: true, isPartial: false }, renderTheme, { durationMs });
		assert.doesNotMatch(rendered.render(100).join("\n"), /Took/);
	}
	const partial = tool.renderResult(result, { expanded: true, isPartial: true }, renderTheme, { durationMs: 1250 });
	assert.doesNotMatch(partial.render(100).join("\n"), /Took/);
});

test("webfetch renders zero duration", () => {
	const tool = createWebFetchTool();
	const rendered = tool.renderResult({ content: [] }, { expanded: true, isPartial: false }, renderTheme, { durationMs: 0 });
	assert.match(rendered.render(100).join("\n"), /Took 0\.00s/);
});

test("webfetch execute rejects URL credentials with a safe message", async () => {
	const tool = createWebFetchTool();

	await assert.rejects(
		tool.execute("id", { url: "https://user:pass@example.com/secret" }),
		(error: unknown) => error instanceof Error && error.message === "URL credentials are not supported",
	);
});

test("createWebFetchHeaders uses the OpenCode browser-like default user agent", () => {
	const headers = createWebFetchHeaders("text/html");
	assert.equal(headers["User-Agent"], OPENCODE_WEBFETCH_DEFAULT_USER_AGENT);
	assert.equal(headers.Accept, "text/html");
	assert.equal(headers["Accept-Language"], "en-US,en;q=0.9");
});

test("getFallbackUserAgent prefers the configured setting and otherwise falls back to opencode", () => {
	assert.equal(getFallbackUserAgent("my-agent/1.0"), "my-agent/1.0");
	assert.equal(getFallbackUserAgent("  custom-agent  "), "custom-agent");
	assert.equal(getFallbackUserAgent(""), OPENCODE_WEBFETCH_FALLBACK_USER_AGENT);
	assert.equal(getFallbackUserAgent("   "), OPENCODE_WEBFETCH_FALLBACK_USER_AGENT);
	assert.equal(getFallbackUserAgent(undefined), OPENCODE_WEBFETCH_FALLBACK_USER_AGENT);
});

test("shouldRetryWithFallbackUserAgent only retries the Cloudflare challenge case", () => {
	assert.equal(
		shouldRetryWithFallbackUserAgent({
			status: 403,
			headers: new Headers({ "cf-mitigated": "challenge" }),
		}),
		true,
	);
	assert.equal(
		shouldRetryWithFallbackUserAgent({
			status: 403,
			headers: new Headers(),
		}),
		false,
	);
	assert.equal(
		shouldRetryWithFallbackUserAgent({
			status: 429,
			headers: new Headers({ "cf-mitigated": "challenge" }),
		}),
		false,
	);
});
