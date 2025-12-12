import type { Bindings, ArticlePayload } from "../types";
import { safeReadText } from "../utils";

export async function sendMessage(
	env: Bindings,
	chatId: string | number,
	text: string,
	replyMarkup?: unknown,
): Promise<void> {
	if (!env.TELEGRAM_BOT_TOKEN) {
		console.warn("Telegram bot token not set; skip sendMessage.");
		return;
	}

	// Add 5 second timeout to prevent hanging
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 5000);

	try {
		const response = await fetch(
			`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					chat_id: chatId,
					text,
					reply_markup: replyMarkup,
				}),
				signal: controller.signal,
			},
		);

		clearTimeout(timeoutId);

		if (!response.ok) {
			const message = await safeReadText(response);
			throw new Error(
				`Telegram sendMessage failed: ${response.status} ${message}`,
			);
		}
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error("Telegram API request timed out after 5 seconds");
		}
		throw error;
	}
}

export function buildArticleReviewKeyboard(submissionId: string) {
	return {
		inline_keyboard: [
			[
				{ text: "✅ 发布", callback_data: `approve:${submissionId}` },
				{ text: "❌ 拒绝", callback_data: `reject:${submissionId}` },
			],
			[
				{
					text: "⭐ 修改重要级别",
					callback_data: `edit-importance:${submissionId}`,
				},
				{ text: "✏️ 修改标题", callback_data: `edit-title:${submissionId}` },
				{ text: "🧾 修改简介", callback_data: `edit-description:${submissionId}` },
			],
		],
	};
}

export function formatArticleReviewMessage(
	article: ArticlePayload,
	options?: {
		intro?: string;
		includeEditHint?: boolean;
		previewLimit?: number;
	},
): string {
	const previewLimit = options?.previewLimit ?? 500;
	const preview =
		article.content.length > previewLimit
			? `${article.content.slice(0, previewLimit)}…`
			: article.content;

	const lines: Array<string | undefined> = [];

	if (options?.intro) {
		lines.push(options.intro, "");
	}

	lines.push(
		`收到新投稿：${article.title}`,
		article.author ? `作者：${article.author}` : undefined,
		article.description ? `简介：${article.description}` : undefined,
		`重要级别：${article.importance}`,
		`时间戳：${article.timestamp}`,
	);

	const mediaLines: string[] = [];

	if (article.backgroundImage) {
		mediaLines.push(`封面图：${article.backgroundImage}`);
	}

	if (article.gallery?.length) {
		mediaLines.push("图库：");
		article.gallery.forEach((item, idx) => {
			const label = item.type === "video" ? "视频" : "图片";
			mediaLines.push(`${idx + 1}. ${label}：${item.src}`);
			if (item.poster) {
				mediaLines.push(`   poster：${item.poster}`);
			}
		});
	}

	if (mediaLines.length) {
		lines.push("", "图片直链：", ...mediaLines);
	}

	lines.push("", "内容预览：", preview);

	if (options?.includeEditHint !== false) {
		lines.push("", "👇 可直接发布/拒绝，或先修改标题/简介/重要级别。");
	}

	return lines.filter((line): line is string => line !== undefined).join("\n");
}

export async function answerCallback(
	env: Bindings,
	callbackId: string,
	text: string,
): Promise<void> {
	if (!env.TELEGRAM_BOT_TOKEN) {
		console.warn("Telegram bot token not set; skip answerCallbackQuery.");
		return;
	}

	// Add 5 second timeout to prevent hanging
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 5000);

	try {
		const response = await fetch(
			`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ callback_query_id: callbackId, text }),
				signal: controller.signal,
			},
		);

		clearTimeout(timeoutId);

		if (!response.ok) {
			const message = await safeReadText(response);
			console.error(
				`Telegram answerCallbackQuery failed: ${response.status} ${message}`,
			);
		}
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === "AbortError") {
			console.error("Telegram answerCallbackQuery timed out after 5 seconds");
		} else {
			console.error("Telegram answerCallbackQuery error:", error);
		}
	}
}

export async function notifyReviewer(
	env: Bindings,
	submissionId: string,
	article: ArticlePayload,
): Promise<void> {
	if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_REVIEWER_ID) {
		console.warn("Telegram not configured; skipping reviewer notification.");
		return;
	}

	const message = formatArticleReviewMessage(article);
	const keyboard = buildArticleReviewKeyboard(submissionId);

	await sendMessage(env, env.TELEGRAM_REVIEWER_ID, message, keyboard);
}
