import type { Bindings } from "../types";

// Minimal KV adapter so the rest of the code doesn't depend on Cloudflare-specific APIs.
export type KvAdapter = {
	get(key: string): Promise<string | null>;
	put(
		key: string,
		value: string,
		options?: { expiration?: number; expirationTtl?: number },
	): Promise<void>;
	delete(key: string): Promise<void>;
};

// Create an adapter backed by Cloudflare KV if configured, otherwise fall back to an in-memory Map.
export function createKvAdapter(
	env: Bindings,
	bindingName: keyof Bindings & string,
): KvAdapter {
	const kv = env[bindingName] as Bindings[keyof Bindings] | undefined;

	if (!kv) {
		console.warn(
			`KV binding "${bindingName}" not configured; using in-memory store (non-persistent).`,
		);
		const memory = new Map<string, string>();

		return {
			async get(key) {
				return memory.get(key) ?? null;
			},
			async put(key, value) {
				memory.set(key, value);
			},
			async delete(key) {
				memory.delete(key);
			},
		};
	}

	// Cloudflare KVNamespace is duck-typed here to avoid importing runtime types.
	const namespace = kv as unknown as {
		get(key: string): Promise<string | null>;
		put(
			key: string,
			value: string,
			options?: { expiration?: number; expirationTtl?: number },
		): Promise<void>;
		delete(key: string): Promise<void>;
	};

	return {
		get(key) {
			return namespace.get(key);
		},
		put(key, value, options) {
			return namespace.put(key, value, options);
		},
		delete(key) {
			return namespace.delete(key);
		},
	};
}

