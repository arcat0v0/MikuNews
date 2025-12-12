import type { ArticlePayload, Bindings } from "../types";
import { createKvAdapter } from "./kv-adapter";

const PENDING_TTL_SECONDS = 60 * 60 * 24; // keep submissions for up to 24 hours
const PENDING_PREFIX = "pending-submission:";

export async function savePendingSubmission(
	env: Bindings,
	id: string,
	article: ArticlePayload,
) {
	if (!env.MikuNewsKV) {
		// Reviewer流程强依赖持久化KV，这里直接报错而不是退回内存
		throw new Error(
			"MikuNewsKV binding is not configured; cannot persist pending submission.",
		);
	}

	const kv = createKvAdapter(env, "MikuNewsKV");
	await kv.put(
		PENDING_PREFIX + id,
		JSON.stringify(article),
		{ expirationTtl: PENDING_TTL_SECONDS },
	);
}

export async function getPendingSubmission(
	env: Bindings,
	id: string,
): Promise<ArticlePayload | null> {
	if (!env.MikuNewsKV) {
		console.error(
			"getPendingSubmission called but MikuNewsKV is not configured; this will always miss.",
		);
		return null;
	}

	const kv = createKvAdapter(env, "MikuNewsKV");
	const raw = await kv.get(PENDING_PREFIX + id);
	if (!raw) return null;

	try {
		return JSON.parse(raw) as ArticlePayload;
	} catch (error) {
		console.error("Failed to parse pending submission from KV", error);
		await kv
			.delete(PENDING_PREFIX + id)
			.catch((cleanupError) =>
				console.error(
					"Failed to delete invalid pending submission from KV",
					cleanupError,
				),
			);
		return null;
	}
}

export async function deletePendingSubmission(env: Bindings, id: string) {
	if (!env.MikuNewsKV) {
		console.error(
			"deletePendingSubmission called but MikuNewsKV is not configured; nothing to delete.",
		);
		return;
	}

	const kv = createKvAdapter(env, "MikuNewsKV");
	await kv.delete(PENDING_PREFIX + id);
}
