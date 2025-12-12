import type { Bindings } from "../types";
import { createKvAdapter } from "./kv-adapter";

const EDIT_SESSION_PREFIX = "edit-session:";
const EDIT_SESSION_TTL_SECONDS = 60 * 30; // 30 minutes

export type EditSessionField = "title" | "description" | "importance";

export type EditSession = {
	submissionId: string;
	field: EditSessionField;
};

export async function saveEditSession(
	env: Bindings,
	userId: string,
	session: EditSession,
) {
	if (!env.MikuNewsKV) {
		throw new Error(
			"MikuNewsKV binding is not configured; cannot persist edit session.",
		);
	}

	const kv = createKvAdapter(env, "MikuNewsKV");
	await kv.put(
		EDIT_SESSION_PREFIX + userId,
		JSON.stringify(session),
		{ expirationTtl: EDIT_SESSION_TTL_SECONDS },
	);
}

export async function getEditSession(
	env: Bindings,
	userId: string,
): Promise<EditSession | null> {
	if (!env.MikuNewsKV) {
		console.error(
			"getEditSession called but MikuNewsKV is not configured; this will always miss.",
		);
		return null;
	}

	const kv = createKvAdapter(env, "MikuNewsKV");
	const raw = await kv.get(EDIT_SESSION_PREFIX + userId);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as Partial<EditSession>;
		if (
			!parsed ||
			typeof parsed.submissionId !== "string" ||
			(parsed.field !== "title" &&
				parsed.field !== "description" &&
				parsed.field !== "importance")
		) {
			throw new Error("Invalid edit session payload");
		}
		return { submissionId: parsed.submissionId, field: parsed.field };
	} catch (error) {
		console.error("Failed to parse edit session from KV", error);
		await kv
			.delete(EDIT_SESSION_PREFIX + userId)
			.catch((cleanupError) =>
				console.error(
					"Failed to delete invalid edit session from KV",
					cleanupError,
				),
			);
		return null;
	}
}

export async function deleteEditSession(env: Bindings, userId: string) {
	if (!env.MikuNewsKV) {
		console.error(
			"deleteEditSession called but MikuNewsKV is not configured; nothing to delete.",
		);
		return;
	}

	const kv = createKvAdapter(env, "MikuNewsKV");
	await kv.delete(EDIT_SESSION_PREFIX + userId);
}
