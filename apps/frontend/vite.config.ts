import path from "node:path";
import fs from "node:fs/promises";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

async function listMarkdownFiles(dir: string): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const results: string[] = [];
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...(await listMarkdownFiles(fullPath)));
			continue;
		}
		if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
			results.push(fullPath);
		}
	}
	return results;
}

function bundleArticlesPlugin(): Plugin {
	const articlesDir = path.resolve(__dirname, "../../articles");
	let outDirAbs = "";

	return {
		name: "mikunews:bundle-articles",
		apply: "build",
		configResolved(config: ResolvedConfig) {
			outDirAbs = path.resolve(config.root, config.build.outDir);
		},
		async buildStart() {
			let markdownFiles: string[] = [];
			try {
				markdownFiles = await listMarkdownFiles(articlesDir);
			} catch (error) {
				throw new Error(
					`[mikunews] Failed to read articles directory at "${articlesDir}". Ensure it exists when building.\n${String(
						error,
					)}`,
				);
			}

			if (markdownFiles.length === 0) {
				throw new Error(
					`[mikunews] No markdown articles found at "${articlesDir}". The production bundle will have no article content.`,
				);
			}
		},
		async closeBundle() {
			const markdownFiles = await listMarkdownFiles(articlesDir);
			const destBase = path.join(outDirAbs, "articles");

			await fs.mkdir(destBase, { recursive: true });
			await Promise.all(
				markdownFiles.map(async (filePath) => {
					const relativePath = path.relative(articlesDir, filePath);
					const destPath = path.join(destBase, relativePath);
					await fs.mkdir(path.dirname(destPath), { recursive: true });
					await fs.copyFile(filePath, destPath);
				}),
			);
		},
	};
}

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		bundleArticlesPlugin(),
		nodePolyfills({
			// 添加 Buffer polyfill，让 gray-matter 能在浏览器中工作
			include: ["buffer"],
			globals: {
				Buffer: true,
			},
		}),
	],
	resolve: {
		alias: {
			"@articles": path.resolve(__dirname, "../../articles"),
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		fs: {
			// 允许访问项目根目录，这样可以读取 articles 文件夹
			allow: [".."],
		},
	},
});
