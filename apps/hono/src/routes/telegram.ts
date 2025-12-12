import type { Hono } from "hono";
import type { Bindings } from "../types";
import {
	getPendingSubmission,
	deletePendingSubmission,
	savePendingSubmission,
	getEditSession,
	saveEditSession,
	deleteEditSession,
} from "../store";
import {
	sendMessage,
	answerCallback,
	pushArticleToGitHub,
	buildArticleReviewKeyboard,
	formatArticleReviewMessage,
} from "../services";

export function registerTelegramRoute(app: Hono<{ Bindings: Bindings }>) {
	app.post("/telegram/webhook", async (c) => {
		console.log("📨 Received Telegram webhook request");

		if (c.env.TELEGRAM_WEBHOOK_SECRET) {
			const secret = c.req.query("secret");
			console.log("🔐 Checking webhook secret...");
			if (secret !== c.env.TELEGRAM_WEBHOOK_SECRET) {
				console.error("❌ Webhook secret mismatch");
				return c.json({ error: "Unauthorized" }, 401);
			}
			console.log("✅ Webhook secret verified");
		} else {
			console.log("⚠️  No webhook secret configured");
		}

		let update: any;
		try {
			update = await c.req.json();
			console.log("📦 Webhook update:", JSON.stringify(update, null, 2));
		} catch (error) {
			console.error("❌ Failed to parse Telegram update", error);
			return c.json({ ok: false, error: "Invalid update" }, 400);
		}

		// Handle regular messages to get user ID or accept edits
		const message = update?.message;
		if (message) {
			const userId = message.from?.id;
			const userIdStr = userId !== undefined ? String(userId) : "";
			const username = message.from?.username;
			const firstName = message.from?.first_name;
			const text = message.text?.trim();
			const reviewerId = String(c.env.TELEGRAM_REVIEWER_ID);

			console.log(
				`💬 Received message from user ${userId} (@${username || "no-username"}): "${text}"`,
			);

			// If reviewer is in an edit session, treat text as the new value
			if (text && userIdStr === reviewerId) {
				const editSession = await getEditSession(c.env, userIdStr);
				if (editSession) {
					if (text === "/cancel") {
						await deleteEditSession(c.env, userIdStr).catch((error) =>
							console.error("Failed to clear edit session", error),
						);
						await sendMessage(
							c.env,
							userIdStr,
							"已取消本次字段修改，原数据保持不变。",
							buildArticleReviewKeyboard(editSession.submissionId),
						);
						return c.json({ ok: true, message: "Edit session cancelled" });
					}

					const pendingArticle = await getPendingSubmission(
						c.env,
						editSession.submissionId,
					);

					if (!pendingArticle) {
						await deleteEditSession(c.env, userIdStr).catch((error) =>
							console.error("Failed to clear edit session after missing submission", error),
						);
						await sendMessage(
							c.env,
							userIdStr,
							"当前投稿已不存在或已处理，无法修改。",
						);
						return c.json({ ok: false, error: "Pending submission missing" }, 404);
					}

					const trimmedText = text.trim();
					let updatedArticle = pendingArticle;
					let intro: string | undefined;

					if (editSession.field === "title") {
						if (!trimmedText) {
							await sendMessage(
								c.env,
								userIdStr,
								"标题不能为空，请重新输入或发送 /cancel 退出修改。",
							);
							return c.json({ ok: false, error: "Empty title" }, 400);
						}
						updatedArticle = { ...pendingArticle, title: trimmedText };
						intro = `已将标题修改为《${trimmedText}》`;
					} else if (editSession.field === "description") {
						if (!trimmedText) {
							await sendMessage(
								c.env,
								userIdStr,
								"简介不能为空，请重新输入或发送 /cancel 退出修改。",
							);
							return c.json({ ok: false, error: "Empty description" }, 400);
						}
						updatedArticle = { ...pendingArticle, description: trimmedText };
						intro = "已更新简介。";
					} else if (editSession.field === "importance") {
						const parsed = Number(trimmedText);
						if (
							!Number.isInteger(parsed) ||
							parsed < 1 ||
							parsed > 4
						) {
							await sendMessage(
								c.env,
								userIdStr,
								"重要级别仅支持 1-4，请重新输入数字或发送 /cancel 退出修改。",
							);
							return c.json({ ok: false, error: "Invalid importance value" }, 400);
						}
						updatedArticle = {
							...pendingArticle,
							importance: parsed as 1 | 2 | 3 | 4,
						};
						intro = `已将重要级别更新为 ${parsed}。`;
					}

					try {
						await savePendingSubmission(
							c.env,
							editSession.submissionId,
							updatedArticle,
						);
						await deleteEditSession(c.env, userIdStr).catch((error) =>
							console.error("Failed to clear edit session after update", error),
						);

						const updatedMessage = formatArticleReviewMessage(updatedArticle, {
							intro,
						});
						await sendMessage(
							c.env,
							userIdStr,
							updatedMessage,
							buildArticleReviewKeyboard(editSession.submissionId),
						);
						return c.json({ ok: true, message: "Submission updated" });
					} catch (error) {
						console.error("Failed to update pending submission", error);
						return c.json(
							{ ok: false, error: "Failed to update pending submission" },
							500,
						);
					}
				}
			}

			// If user sends /getid or /id command, reply with their ID
			if (text === "/getid" || text === "/id" || text === "/start") {
				console.log(`🔍 User ${userId} requested their ID`);
				const replyText = [
					`你的 Telegram 账户信息：`,
					`ID: ${userId}`,
					username ? `用户名: @${username}` : undefined,
					firstName ? `名字: ${firstName}` : undefined,
					"",
					`将此 ID 设置为 TELEGRAM_REVIEWER_ID 环境变量即可使用审核功能。`,
				]
					.filter(Boolean)
					.join("\n");

				try {
					await sendMessage(c.env, userId, replyText);
					console.log(`✅ Sent user ID to ${userId}`);
				} catch (error) {
					console.error(`❌ Failed to send message to ${userId}:`, error);
					return c.json({ ok: false, error: "Failed to send message" }, 500);
				}
				return c.json({ ok: true, message: "Sent user ID" });
			}

			// For any other message, just acknowledge
			console.log(`ℹ️  Ignoring non-command message from ${userId}`);
			return c.json({ ok: true, message: "Message received" });
		}

		const callback = update?.callback_query;
		if (!callback) {
			console.log("ℹ️  Received non-callback, non-message update - ignoring");
			return c.json({ ok: true, message: "Ignored non-callback update" });
		}

		console.log(`🔘 Received callback query from user ${callback.from?.id}`);
		const fromId = String(callback.from?.id ?? "");
		const reviewerId = String(c.env.TELEGRAM_REVIEWER_ID);
		if (fromId !== reviewerId) {
			console.error(
				`❌ Unauthorized callback from ${fromId}, expected ${c.env.TELEGRAM_REVIEWER_ID}`,
			);
			await answerCallback(c.env, callback.id, "无权操作此投稿");
			return c.json({ ok: false, error: "Invalid reviewer" }, 403);
		}
		console.log(`✅ Callback from authorized reviewer ${fromId}`);

		const data: string | undefined = callback.data;
		const [action, submissionId] = data?.split(":") ?? [];
		if (!action || !submissionId) {
			await answerCallback(c.env, callback.id, "无法识别的指令");
			return c.json({ ok: false, error: "Malformed callback data" }, 400);
		}

		const article = await getPendingSubmission(c.env, submissionId);
		if (!article) {
			await answerCallback(c.env, callback.id, "投稿已不存在或已处理");
			await deleteEditSession(c.env, fromId).catch((error) =>
				console.error("Failed to clear edit session after missing submission", error),
			);
			return c.json({ ok: false, error: "Submission not found" }, 404);
		}

		if (
			action === "edit-title" ||
			action === "edit-description" ||
			action === "edit-importance"
		) {
			const field =
				action === "edit-title"
					? "title"
					: action === "edit-description"
						? "description"
						: "importance";

			try {
				await saveEditSession(c.env, fromId, { submissionId, field });
			} catch (error) {
				console.error("Failed to persist edit session", error);
				await answerCallback(c.env, callback.id, "无法创建编辑会话，请稍后重试");
				return c.json({ ok: false, error: "Failed to persist edit session" }, 500);
			}

			const fieldLabel =
				field === "title"
					? "标题"
					: field === "description"
						? "简介"
						: "重要级别";
			const currentValue =
				field === "title"
					? article.title
					: field === "description"
						? article.description || "（当前无简介）"
						: `当前重要级别：${article.importance}`;
			const instructions =
				field === "importance"
					? "请发送 1-4 设置新的重要级别，或发送 /cancel 取消修改。"
					: "请直接发送新的内容，或发送 /cancel 取消修改。";

			await answerCallback(c.env, callback.id, `请回复新的${fieldLabel}`);
			await sendMessage(
				c.env,
				reviewerId,
				[`准备修改${fieldLabel}。`, currentValue, instructions]
					.filter(Boolean)
					.join("\n"),
				buildArticleReviewKeyboard(submissionId),
			);

			return c.json({ ok: true, status: "awaiting edit value" });
		}

		if (action === "approve") {
			try {
				const fileName = await pushArticleToGitHub(c.env, article);
				console.log("Article pushed to GitHub:", fileName);
				await deletePendingSubmission(c.env, submissionId).catch((error) =>
					console.error("Failed to delete pending submission after publish", error),
				);
				await deleteEditSession(c.env, fromId).catch((error) =>
					console.error("Failed to clear edit session after publish", error),
				);
				console.log("Approved submission", submissionId, "title:", article.title);
				await answerCallback(c.env, callback.id, "已发布到 GitHub 仓库");
				await sendMessage(
					c.env,
					c.env.TELEGRAM_REVIEWER_ID,
					`✅ 已发布文章《${article.title}》\n文件：${fileName}`,
				);
				return c.json({ ok: true, status: "published", fileName });
			} catch (error) {
				console.error("Failed to push article to GitHub", error);
				await answerCallback(c.env, callback.id, "推送文章到 GitHub 失败，请稍后重试");
				return c.json({ ok: false, error: "Failed to push article to GitHub" }, 500);
			}
		}

		if (action === "reject") {
			await deletePendingSubmission(c.env, submissionId).catch((error) =>
				console.error("Failed to delete pending submission after reject", error),
			);
			await deleteEditSession(c.env, fromId).catch((error) =>
				console.error("Failed to clear edit session after reject", error),
			);
			console.log("Rejected submission", submissionId, "title:", article.title);
			await answerCallback(c.env, callback.id, "已拒绝该投稿");
			await sendMessage(
				c.env,
				c.env.TELEGRAM_REVIEWER_ID,
				`❌ 已拒绝文章《${article.title}》`,
			);
			return c.json({ ok: true, status: "rejected" });
		}

		await answerCallback(c.env, callback.id, "未知操作");
		return c.json({ ok: false, error: "Unknown action" }, 400);
	});
}
