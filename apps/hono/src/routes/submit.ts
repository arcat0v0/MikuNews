import type { Hono } from "hono";
import type { Bindings, ArticlePayload } from "../types";
import {
	savePendingSubmission,
	deletePendingSubmission,
} from "../store";
import { validateArticlePayload, notifyReviewer } from "../services";

export function registerSubmitRoute(app: Hono<{ Bindings: Bindings }>) {
	app.post("/submit", async (c) => {
		let payload: unknown;
		try {
			payload = await c.req.json();
			console.log(
				"Received /submit raw payload:",
				JSON.stringify(payload, null, 2),
			);
		} catch (error) {
			console.error("Failed to parse submission body", error);
			return c.json({ error: "Invalid JSON body" }, 400);
		}

		const article = validateArticlePayload(payload);
		if (!article) {
			return c.json({ error: "Payload validation failed", body: payload }, 400);
		}
		console.log("Validated article payload:");
		console.log("  - ID:", article.id);
		console.log("  - Title:", article.title);
		console.log("  - Author:", article.author);
		console.log("  - Importance:", article.importance);
		console.log("  - Timestamp:", article.timestamp);
		if (article.gallery && article.gallery.length > 0) {
			console.log("  - Gallery items:", article.gallery.length);
			article.gallery.forEach((item, idx) => {
				console.log(`    [${idx + 1}] ${item.type}: ${item.src}`);
			});
		} else {
			console.log("  - Gallery: none");
		}

		const submissionId = crypto.randomUUID();
		const normalizedArticle: ArticlePayload = {
			...article,
			id: article.id || crypto.randomUUID(),
		};

		try {
			await savePendingSubmission(c.env, submissionId, normalizedArticle);
		} catch (error) {
			console.error("Failed to cache submission", error);
			return c.json({ error: "Failed to cache submission" }, 500);
		}

		try {
			await notifyReviewer(c.env, submissionId, normalizedArticle);
		} catch (error) {
			console.error("Failed to notify reviewer via Telegram", error);
			await deletePendingSubmission(c.env, submissionId).catch((cleanupError) =>
				console.error("Failed to clean up cached submission", cleanupError),
			);
			return c.json(
				{ error: "Failed to notify reviewer", details: String(error) },
				502,
			);
		}

		return c.json({
			ok: true,
			submissionId,
			note:
				!c.env.TELEGRAM_BOT_TOKEN || !c.env.TELEGRAM_REVIEWER_ID
					? "No Telegram bot configured; submission kept in memory only."
					: undefined,
		});
	});
}
