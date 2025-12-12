import type { ArticlePayload } from "../types";
import { quote } from "../utils";

// Build a markdown filename using "date + article title", e.g.
// 2025-01-30-某条新闻标题.md
export function buildArticleFileName(article: ArticlePayload): string {
	const date = new Date(article.timestamp);
	const datePrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

	// Prefer title; fall back to id to avoid empty filenames.
	const rawTitle = article.title || article.id || "article";

	// Remove characters that are problematic in filenames on common OSes.
	const safeTitle =
		rawTitle.replace(/[\\/:*?"<>|]/g, " ").trim() || "article";

	return `${datePrefix}-${safeTitle}.md`;
}

export function buildFrontMatter(article: ArticlePayload): string {
	const lines: string[] = ["---"];
	lines.push(`title: ${quote(article.title)}`);
	lines.push(`id: ${quote(article.id || crypto.randomUUID())}`);
	lines.push(`importance: ${article.importance}`);
	lines.push(`color: ${quote(article.color)}`);
	if (article.description)
		lines.push(`description: ${quote(article.description)}`);
	if (article.backgroundImage)
		lines.push(`backgroundImage: ${quote(article.backgroundImage)}`);
	lines.push(`timestamp: ${article.timestamp}`);
	if (article.author) lines.push(`author: ${quote(article.author)}`);
	if (article.gallery?.length) {
		lines.push("gallery:");
		for (const item of article.gallery) {
			lines.push(`  - type: ${item.type}`);
			lines.push(`    src: ${quote(item.src)}`);
			if (item.alt) lines.push(`    alt: ${quote(item.alt)}`);
			if (item.poster) lines.push(`    poster: ${quote(item.poster)}`);
		}
	}
	lines.push("---");
	return lines.join("\n");
}
