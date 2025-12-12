import matter from "gray-matter";
import type { Article } from "@mikunews/models";
import type { RectangleProps } from "../components/Rectangle";

/**
 * 解析 markdown 文件内容，提取 front matter 和正文
 */
export function parseArticle(markdown: string, slug: string): Article | null {
	try {
		const { data, content } = matter(markdown);

		// 验证必需字段
		if (
			!data.title ||
			typeof data.importance !== "number" ||
			!data.color ||
			!data.timestamp ||
			typeof data.id !== "string" ||
			data.id.trim().length === 0
		) {
			console.warn(`Article ${slug} is missing required fields`);
			return null;
		}

		// 验证 importance 值是否有效
		if (![1, 2, 3, 4].includes(data.importance)) {
			console.warn(
				`Article ${slug} has invalid importance value: ${data.importance}`,
			);
			return null;
		}

		return {
			title: data.title,
			importance: data.importance as 1 | 2 | 3 | 4,
			color: data.color,
			description: data.description,
			backgroundImage: data.backgroundImage,
			timestamp: data.timestamp,
			author: data.author,
			gallery: data.gallery,
			isTop: data.isTop === true,
			useNineGrid: data.useNineGrid === true,
			content: content.trim(),
			slug,
			id: data.id.trim(),
		};
	} catch (error) {
		console.error(`Failed to parse article ${slug}:`, error);
		return null;
	}
}

/**
 * 将 Article 转换为 RectangleProps
 */
export function articleToRectangle(article: Article): RectangleProps {
	return {
		title: article.title,
		importance: article.importance,
		color: article.color,
		description: article.description,
		backgroundImage: article.backgroundImage,
		timestamp: article.timestamp,
		author: article.author,
		gallery: article.gallery,
		isTop: article.isTop,
		useNineGrid: article.useNineGrid,
		content: article.content,
		slug: article.slug,
		id: article.id,
	};
}

/**
 * 加载所有文章（使用 Vite 的 import.meta.glob 进行静态编译）
 * 这个函数会在构建时被 Vite 处理，将所有 markdown 文件内容内联到打包文件中
 */
export function loadAllArticles(): Article[] {
	// import.meta.glob 的路径是相对于当前文件的
	// 当前文件：apps/frontend/src/utils/articleParser.ts
	// 目标目录：articles/
	// 相对路径：../../../../articles/
	const articleModules = import.meta.glob<string>(
		"../../../../articles/**/*.md",
		{
			query: "?raw",
			import: "default",
			eager: true,
		},
	);

	const articles: Article[] = [];

	// 同步处理所有文章（因为已经在构建时加载）
	for (const [path, markdown] of Object.entries(articleModules)) {
		// 从路径中提取文件名作为 slug
		const slug = path.split("/").pop()?.replace(".md", "") || "";
		const article = parseArticle(markdown, slug);
		if (article) {
			articles.push(article);
		}
	}

	return articles;
}

/**
 * 加载所有文章并转换为 RectangleProps 数组
 */
export function loadArticlesAsRectangles(): RectangleProps[] {
	const articles = loadAllArticles();
	return articles.map(articleToRectangle);
}
