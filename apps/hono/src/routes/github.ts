import { Hono } from "hono";
import {
	listGitHubFiles,
	pushArticleToGitHub,
	deleteGitHubFile,
} from "../services/github.service";
import type { Bindings } from "../types/bindings";
import type { ArticlePayload } from "../types";

const github = new Hono<{ Bindings: Bindings }>();

github.get("/test-connection", async (c) => {
	try {
		const files = await listGitHubFiles(c.env);
		return c.json({
			status: "success",
			message: "Successfully connected to GitHub",
			fileCount: files.length,
			files: files.map((f) => ({ name: f.name, sha: f.sha })),
		});
	} catch (error: any) {
		console.error("GitHub connection test failed:", error);
		return c.json(
			{
				status: "error",
				message: error.message,
			},
			500,
		);
	}
});

github.post("/test-push", async (c) => {
	try {
		const testArticle: ArticlePayload = {
			id: `test-${Date.now()}`,
			title: `Test Article ${new Date().toISOString()}`,
			content: "This is a test article pushed from MikuNews Hono backend.",
			timestamp: new Date().toISOString(),
			source: "Test",
			url: "https://example.com",
            images: []
		};

		const fileName = await pushArticleToGitHub(c.env, testArticle);
		return c.json({
			status: "success",
			message: "Successfully pushed test article",
			fileName,
		});
	} catch (error: any) {
		console.error("GitHub push test failed:", error);
		return c.json(
			{
				status: "error",
				message: error.message,
			},
			500,
		);
	}
});

export default github;
