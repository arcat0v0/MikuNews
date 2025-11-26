import { useMemo, useState, useEffect } from "react";
import { Rectangle, type RectangleProps } from "./components/Rectangle";
import { WebsiteInfoCard } from "./components/WebsiteInfoCard";
import { ArticleModal } from "./components/ArticleModal";
import { loadArticlesAsRectangles } from "./utils/articleParser";
import { autoLayout, type LayoutItem } from "./utils/layoutAlgorithm";
import type { MediaItem } from "./utils/articleParser";
import "./App.css";

// 在模块顶层同步加载所有文章（编译时已打包）
const rawRectangles: RectangleProps[] = loadArticlesAsRectangles();

function App() {
	const [selectedArticle, setSelectedArticle] = useState<{
		content: string;
		title?: string;
		author?: string;
		timestamp?: number;
		gallery?: MediaItem[];
		originRect: DOMRect | null;
	} | null>(null);

	// 检测暗黑模式
	const [isDarkMode, setIsDarkMode] = useState(false);

	useEffect(() => {
		// 初始检测
		const darkModeMediaQuery = window.matchMedia(
			"(prefers-color-scheme: dark)",
		);
		setIsDarkMode(darkModeMediaQuery.matches);

		// 监听变化
		const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
		darkModeMediaQuery.addEventListener("change", handler);

		return () => darkModeMediaQuery.removeEventListener("change", handler);
	}, []);

	// 使用布局算法自动排序
	const rectangles = useMemo(() => {
		if (rawRectangles.length === 0) return [];
		return autoLayout(rawRectangles);
	}, []);

	if (rectangles.length === 0) {
		return (
			<div className="bg-white overflow-hidden flex items-center justify-center h-screen">
				<div className="text-gray-500">暂无文章</div>
			</div>
		);
	}

	return (
		<>
			<div className="bg-white overflow-hidden">
				<div className="grid grid-cols-4 auto-rows-auto bg-gray-300">
					{rectangles.map((rect: LayoutItem, index: number) =>
						rect.isWebsiteInfo ? (
							// 渲染网站信息卡片
							<WebsiteInfoCard
								key="website-info"
								importance={rect.importance}
								isDarkMode={isDarkMode}
							/>
						) : (
							// 渲染普通文章卡片
							<Rectangle
								key={`rectangle-${index}-${rect.title}`}
								{...rect}
								onClick={
									rect.content
										? (e) => {
												const target = e.currentTarget;
												const domRect = target.getBoundingClientRect();
												setSelectedArticle({
													content: rect.content || "",
													title: rect.title,
													author: rect.author,
													timestamp: rect.timestamp,
													gallery: rect.gallery,
													originRect: domRect,
												});
											}
										: undefined
								}
							/>
						),
					)}
				</div>
			</div>

			{/* 文章详情模态框 */}
			<ArticleModal
				content={selectedArticle?.content || ""}
				title={selectedArticle?.title}
				author={selectedArticle?.author}
				timestamp={selectedArticle?.timestamp}
				gallery={selectedArticle?.gallery}
				isOpen={!!selectedArticle}
				onClose={() => setSelectedArticle(null)}
				originRect={selectedArticle?.originRect || null}
			/>
		</>
	);
}

export default App;
