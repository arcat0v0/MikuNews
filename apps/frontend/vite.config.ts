import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
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
