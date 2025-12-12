import type { Hono } from "hono";
import type { Bindings, ArticlePayload } from "../types";
import {
	listAllArticles,
	getGitHubFile,
	createOrUpdateGitHubFile,
	deleteGitHubFile,
	pushArticleToGitHub,
	// We need these internally to check specific branches for PUT logic
	listGitHubFiles, 
} from "../services";
import { validateArticlePayload } from "../services";

// Hardcoded for now, matching service. Could export them from service if needed.
const BRANCH_BUFFER = "articles-buffer";

export function registerArticlesRoute(app: Hono<{ Bindings: Bindings }> ) {
	// GET /articles - 获取所有文章列表 (合并 main 和 articles-buffer)
	app.get("/articles", async (c) => {
		try {
			const files = await listAllArticles(c.env);
			return c.json({
				ok: true,
				count: files.length,
				files: files.map((file) => ({
					name: file.name,
					path: file.path,
					sha: file.sha,
					size: file.size,
					url: file.html_url,
					branch: file.branch, // Useful for frontend to know status
				})),
			});
		} catch (error) {
			console.error("Failed to list articles:", error);
			return c.json(
				{
					ok: false,
					error: "Failed to list articles",
					message: error instanceof Error ? error.message : String(error),
				},
				500,
			);
		}
	});

	// GET /articles/:filename - 获取单个文章内容
	app.get("/articles/:filename", async (c) => {
		const filename = c.req.param("filename");

		if (!filename) {
			return c.json({ ok: false, error: "Filename is required" }, 400);
		}

		try {
			// getGitHubFile now tries buffer first, then main
			const file = await getGitHubFile(c.env, filename);

			// Decode base64 content
			let content = "";
			if (file.content && file.encoding === "base64") {
				content = atob(file.content.replace(/\n/g, ""));
				// Decode UTF-8
				try {
					content = decodeURIComponent(
						content
							.split("")
							.map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
							.join(""),
					);
				} catch (e) {
					console.warn("Failed to decode URI component, using raw", e);
				}
			}

			return c.json({
				ok: true,
				file: {
					name: file.name,
					path: file.path,
					sha: file.sha,
					size: file.size,
					url: file.html_url,
					content,
					branch: file.branch,
				},
			});
		} catch (error) {
			console.error(`Failed to get article ${filename}:`, error);
			return c.json(
				{
					ok: false,
					error: "Failed to get article",
					message: error instanceof Error ? error.message : String(error),
				},
				404,
			);
		}
	});

	// POST /articles - 创建/发布新文章
	app.post("/articles", async (c) => {
		let payload: ArticlePayload;

		try {
			payload = await c.req.json();
		} catch (error) {
			return c.json({ ok: false, error: "Invalid JSON payload" }, 400);
		}

		const validation = validateArticlePayload(payload);
		if (!validation.valid) {
			return c.json(
				{ ok: false, error: "Invalid article payload", issues: validation.issues },
				400,
			);
		}

		try {
			// pushArticleToGitHub internally handles pushing to BUFFER branch
			const fileName = await pushArticleToGitHub(c.env, payload);
			return c.json({
				ok: true,
				message: "Article created/updated in buffer successfully",
				fileName,
			});
		} catch (error) {
			console.error("Failed to create article:", error);
			return c.json(
				{
					ok: false,
					error: "Failed to create article",
					message: error instanceof Error ? error.message : String(error),
				},
				500,
			);
		}
	});

	// PUT /articles/:filename - 更新文章 (Always to Buffer)
	app.put("/articles/:filename", async (c) => {
		const filename = c.req.param("filename");

		if (!filename) {
			return c.json({ ok: false, error: "Filename is required" }, 400);
		}

		let content: string;
		let message: string;

		try {
			const body = await c.req.json();
			content = body.content;
			message = body.message || `Update article: ${filename}`;

			if (!content) {
				return c.json({ ok: false, error: "Content is required" }, 400);
			}
		} catch (error) {
			return c.json({ ok: false, error: "Invalid JSON payload" }, 400);
		}

		try {
			// Check if file exists specifically in BUFFER to determine if we need SHA
			let sha: string | undefined;
			try {
				const bufferFile = await getGitHubFile(c.env, filename, BRANCH_BUFFER);
				sha = bufferFile.sha;
			} catch (e) {
				// Not in buffer, so we are creating a new file (or 'editing' a main file into buffer)
				// No SHA needed
			}

			const result = await createOrUpdateGitHubFile(
				c.env,
				filename,
				content,
				message,
				BRANCH_BUFFER, // Always update to buffer
				sha,
			);

			return c.json({
				ok: true,
				message: "Article updated successfully in buffer",
				fileName: filename,
				sha: result.content?.sha,
				branch: BRANCH_BUFFER,
			});
		} catch (error) {
			console.error(`Failed to update article ${filename}:`, error);
			return c.json(
				{
					ok: false,
					error: "Failed to update article",
					message: error instanceof Error ? error.message : String(error),
				},
				500,
			);
		}
	});

	// DELETE /articles/:filename - 删除文章
	app.delete("/articles/:filename", async (c) => {
		const filename = c.req.param("filename");

		if (!filename) {
			return c.json({ ok: false, error: "Filename is required" }, 400);
		}

		let message: string;

		try {
			const body = await c.req.json();
			message = body.message || `Delete article: ${filename}`;
		} catch (error) {
			message = `Delete article: ${filename}`;
		}

		try {
			// Find where the file is (Buffer > Main)
			const existingFile = await getGitHubFile(c.env, filename);

			if (!existingFile.branch) {
				throw new Error("Could not determine branch of existing file");
			}

			await deleteGitHubFile(c.env, filename, existingFile.sha, message, existingFile.branch);

			return c.json({
				ok: true,
				message: `Article deleted successfully from ${existingFile.branch}`,
				fileName: filename,
				branch: existingFile.branch,
			});
		} catch (error) {
			console.error(`Failed to delete article ${filename}:`, error);
			return c.json(
				{
					ok: false,
					error: "Failed to delete article",
					message: error instanceof Error ? error.message : String(error),
				},
				500,
			);
		}
	});
}