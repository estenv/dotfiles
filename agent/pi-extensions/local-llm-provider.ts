import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Local LLM Provider (localhost:9998)
 *
 * Registers an OpenAI-compatible provider pointing at a local server.
 *
 * Defaults:
 *   baseUrl: http://localhost:9998/v1
 *   provider: local-llm
 *   api: openai-completions (OpenAI Chat Completions compatible)
 *   apiKey: "local" (override with PI_LOCAL_LLM_API_KEY)
 *
 * Environment variables:
 *   PI_LOCAL_LLM_BASE_URL        Base URL (with or without /v1). Default: http://localhost:9998
 *   PI_LOCAL_LLM_API_KEY         API key string to send (default: "local")
 *   PI_LOCAL_LLM_MODELS          Comma-separated model ids (skips /models discovery)
 *   PI_LOCAL_LLM_MODEL           Fallback model id if discovery fails (default: "local-model")
 *   PI_LOCAL_LLM_CONTEXT_WINDOW  Default context window (int, default: 120000)
 *   PI_LOCAL_LLM_MAX_TOKENS      Default max output tokens (int, default: 4096)
 *   PI_LOCAL_LLM_REASONING       Set to 1/true to mark models as reasoning-capable
 *   PI_LOCAL_LLM_VISION          Set to 1/true to mark models as vision-capable
 *
 * Notes:
 * - pi's built-in OpenAI Chat Completions implementation requires a non-empty apiKey.
 *   Most local servers ignore Authorization; if yours rejects it, you may need a
 *   custom streamSimple implementation instead.
 */

function envBool(name: string, defaultValue = false): boolean {
	const v = process.env[name];
	if (v === undefined) return defaultValue;
	return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes" || v.toLowerCase() === "on";
}

function envInt(name: string, defaultValue: number): number {
	const raw = process.env[name];
	if (!raw) return defaultValue;
	const n = Number.parseInt(raw, 10);
	return Number.isFinite(n) ? n : defaultValue;
}

function normalizeBaseUrl(raw: string): string {
	const trimmed = raw.replace(/\/+$/, "");
	// If user already supplied /v1 (or /vN), keep it. Otherwise default to /v1.
	if (/\/v\d+$/.test(trimmed)) return trimmed;
	return `${trimmed}/v1`;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<unknown> {
	const ac = new AbortController();
	const t = setTimeout(() => ac.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			method: "GET",
			headers: { accept: "application/json" },
			signal: ac.signal,
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
		return await res.json();
	} finally {
		clearTimeout(t);
	}
}

function extractModelIds(payload: unknown): string[] {
	// OpenAI-style: { data: [{ id: "..." }, ...] }
	if (payload && typeof payload === "object") {
		const anyPayload = payload as any;
		if (Array.isArray(anyPayload.data)) {
			return anyPayload.data.map((m: any) => m?.id).filter((id: any) => typeof id === "string" && id.length > 0);
		}
		// Some servers: { models: [{ id }...] }
		if (Array.isArray(anyPayload.models)) {
			return anyPayload.models.map((m: any) => m?.id).filter((id: any) => typeof id === "string" && id.length > 0);
		}
	}
	// Some servers: [{ id }...]
	if (Array.isArray(payload)) {
		return payload.map((m: any) => m?.id).filter((id: any) => typeof id === "string" && id.length > 0);
	}
	return [];
}

export default async function localLlmProvider(pi: ExtensionAPI) {
	const baseUrl = normalizeBaseUrl(process.env.PI_LOCAL_LLM_BASE_URL ?? "http://localhost:9998");
	const apiKey = process.env.PI_LOCAL_LLM_API_KEY ?? "local";

	const contextWindow = envInt("PI_LOCAL_LLM_CONTEXT_WINDOW", 120000);
	const maxTokens = envInt("PI_LOCAL_LLM_MAX_TOKENS", 4096);
	const reasoning = envBool("PI_LOCAL_LLM_REASONING", true);
	const vision = envBool("PI_LOCAL_LLM_VISION", false);

	let modelIds: string[] | undefined;

	const manualModels = (process.env.PI_LOCAL_LLM_MODELS ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);

	if (manualModels.length > 0) {
		modelIds = manualModels;
	} else {
		try {
			const payload = await fetchJsonWithTimeout(`${baseUrl}/models`, 1500);
			const discovered = extractModelIds(payload);
			if (discovered.length > 0) modelIds = discovered;
		} catch {
			// Discovery is best-effort; fall back below.
		}
	}

	if (!modelIds || modelIds.length === 0) {
		modelIds = [process.env.PI_LOCAL_LLM_MODEL ?? "local-model"];
	}

	pi.registerProvider("local-llm", {
		name: "Local LLM (localhost:9998)",
		baseUrl,
		apiKey, // literal string; non-empty required by OpenAI SDK-backed streaming
		api: "openai-completions",
		models: modelIds.map((id) => ({
			id,
			name: id,
			reasoning,
			input: vision ? (["text", "image"] as const) : (["text"] as const),
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow,
			maxTokens,
			compat: {
				// Common local-server quirks:
				supportsDeveloperRole: false,
				maxTokensField: "max_tokens",
			},
		})),
	});
}
