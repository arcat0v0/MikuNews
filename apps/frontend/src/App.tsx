import { useState } from "react";
import { Rectangle } from "./components/Rectangle";
import { WebsiteInfoCard } from "./components/WebsiteInfoCard";
import { WelcomeCard } from "./components/WelcomeCard";
import { ArticleModal } from "./components/ArticleModal";
import { NavigationCard } from "./components/NavigationCard";
import { useArticleLayoutStore } from "./store/articleLayoutStore";
import type { MediaItem } from "./utils/articleParser";
import "./App.css";

function App() {
	const [selectedArticle, setSelectedArticle] = useState<{
		content: string;
		title?: string;
		author?: string;
		timestamp?: number;
		gallery?: MediaItem[];
		originRect: DOMRect | null;
	} | null>(null);

	const rectangles = useArticleLayoutStore((state) => state.layoutRectangles);

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
					{rectangles.map((rect, index: number) =>
						rect.isWebsiteInfo ? (
							// 渲染网站信息卡片
							<WebsiteInfoCard
								key="website-info"
								importance={rect.importance}
							/>
						) : rect.isWelcome ? (
							// 渲染欢迎卡片
							<WelcomeCard key="welcome-card" />
						) : rect.isNavigation ? (
							// 渲染导航卡片
							<NavigationCard
								key="navigation-card"
								importance={rect.importance}
								buttons={rect.navigationButtons || []}
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
