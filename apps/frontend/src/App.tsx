import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			const quarterHeight = window.innerHeight / 4;
			const direction = e.deltaY > 0 ? 1 : -1;
			container.scrollBy({
				top: quarterHeight * direction,
				behavior: "smooth",
			});
		};

		container.addEventListener("wheel", handleWheel, { passive: false });
		return () => container.removeEventListener("wheel", handleWheel);
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
			<div
				ref={scrollContainerRef}
				className="bg-white overflow-y-auto h-screen"
			>
				<div className="grid grid-cols-4 auto-rows-auto bg-gray-300">
					<AnimatePresence mode="popLayout">
						{rectangles.map((rect, index: number) =>
							rect.isWebsiteInfo ? (
								<WebsiteInfoCard
									key="website-info"
									importance={rect.importance}
								/>
							) : rect.isWelcome ? (
								<WelcomeCard key="welcome-card" />
							) : rect.isNavigation ? (
								<NavigationCard
									key="navigation-card"
									importance={rect.importance}
									buttons={rect.navigationButtons || []}
								/>
							) : (
								<motion.div
									key={`rectangle-${index}-${rect.title}`}
									layout
									exit={{ opacity: 0, scale: 0.8 }}
									transition={{ duration: 0.3 }}
									style={{
										gridColumn: `span ${rect.importance === 1 ? 2 : rect.importance === 2 ? 2 : rect.importance === 3 ? 1 : rect.importance === 4 ? 1 : 4}`,
										gridRow: `span ${rect.importance === 1 ? 2 : rect.importance === 2 ? 1 : rect.importance === 3 ? 2 : rect.importance === 4 ? 1 : 2}`,
									}}
								>
									<Rectangle
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
								</motion.div>
							),
						)}
					</AnimatePresence>
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
