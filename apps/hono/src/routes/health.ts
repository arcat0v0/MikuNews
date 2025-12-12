import type { Hono } from "hono";
import type { Bindings } from "../types";
import { defaultArticlesDir } from "../config";
import { safeReadText } from "../utils";

export function registerHealthRoute(app: Hono<{ Bindings: Bindings }>) {
	app.get("/", async (c) => {
		const hasBotToken = Boolean(c.env.TELEGRAM_BOT_TOKEN);
		const hasReviewer = Boolean(c.env.TELEGRAM_REVIEWER_ID);

		let botInfo: any = null;
		let botError: string | null = null;
		let webhookInfo: any = null;

		// Try to get bot info if token is available
		if (hasBotToken) {
			try {
				console.log("🔍 Testing Telegram bot connection...");
				const response = await fetch(
					`https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/getMe`,
					{ method: "GET" },
				);
				if (response.ok) {
					const data = await response.json();
					botInfo = data.result;
					console.log("✅ Telegram bot connected:", botInfo.username);
				} else {
					const errorText = await safeReadText(response);
					botError = `HTTP ${response.status}: ${errorText}`;
					console.error("❌ Failed to connect to Telegram bot:", botError);
				}
			} catch (error) {
				botError = String(error);
				console.error("❌ Error connecting to Telegram bot:", error);
			}

			// Get webhook info
			try {
				const response = await fetch(
					`https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
					{ method: "GET" },
				);
				if (response.ok) {
					const data = await response.json();
					webhookInfo = data.result;
				}
			} catch (error) {
				console.error("❌ Error getting webhook info:", error);
			}
		} else {
			console.log("⚠️  No Telegram bot token configured");
		}

		return c.json({
			ok: true,
			message: "MikuNews Hono API is running.",
			telegram: {
				hasBotToken,
				hasReviewer,
				hasWebhookSecret: Boolean(c.env.TELEGRAM_WEBHOOK_SECRET),
				reviewerId: hasReviewer ? c.env.TELEGRAM_REVIEWER_ID : undefined,
				botConnected: botInfo !== null,
				botInfo: botInfo
					? {
							id: botInfo.id,
							username: botInfo.username,
							firstName: botInfo.first_name,
							canJoinGroups: botInfo.can_join_groups,
							canReadAllGroupMessages: botInfo.can_read_all_group_messages,
						}
					: null,
				botError,
				webhookInfo: webhookInfo
					? {
							url: webhookInfo.url,
							hasCustomCertificate: webhookInfo.has_custom_certificate,
							pendingUpdateCount: webhookInfo.pending_update_count,
							lastErrorDate: webhookInfo.last_error_date,
							lastErrorMessage: webhookInfo.last_error_message,
						}
					: null,
			},
			articlesDir: c.env.ARTICLES_DIR ?? defaultArticlesDir,
		});
	});
}
