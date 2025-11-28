import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rectangle } from "./components/Rectangle";
import { WebsiteInfoCard } from "./components/WebsiteInfoCard";
import { WelcomeCard } from "./components/WelcomeCard";
import { NavigationCard } from "./components/NavigationCard";
import { ModalProvider } from "./components/ModalProvider";
import { useArticleLayoutStore } from "./store/articleLayoutStore";
import "./App.css";

function App() {
	const layoutRectangles = useArticleLayoutStore(
		(state) => state.layoutRectangles,
	);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const scrollTargetRef = useRef(0);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		scrollTargetRef.current = container.scrollTop;

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			const direction = Math.sign(e.deltaY);
			if (!direction) return;

			const step = container.clientHeight / 4;
			const maxScroll = container.scrollHeight - container.clientHeight;

			scrollTargetRef.current += step * direction;
			scrollTargetRef.current = Math.max(
				0,
				Math.min(scrollTargetRef.current, maxScroll),
			);

			container.scrollTo({
				top: scrollTargetRef.current,
				behavior: "smooth",
			});
		};

		container.addEventListener("wheel", handleWheel, { passive: false });
		return () => container.removeEventListener("wheel", handleWheel);
	}, []);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		const maxScroll = container.scrollHeight - container.clientHeight;
		scrollTargetRef.current = Math.min(scrollTargetRef.current, maxScroll);
	}, []);

	if (layoutRectangles.length === 0) {
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
						{layoutRectangles.map((rect, index: number) =>
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
								/>
							) : (
								<motion.div
									key={
										rect.id ?? rect.slug ?? `rectangle-${index}-${rect.title}`
									}
									layout
									exit={{ opacity: 0, scale: 0.8 }}
									transition={{ duration: 0.3 }}
									style={{
										gridColumn: `span ${rect.importance === 1 ? 2 : rect.importance === 2 ? 2 : rect.importance === 3 ? 1 : rect.importance === 4 ? 1 : 4}`,
										gridRow: `span ${rect.importance === 1 ? 2 : rect.importance === 2 ? 1 : rect.importance === 3 ? 2 : rect.importance === 4 ? 1 : 2}`,
									}}
									id={
										rect.id
											? `article-${rect.id}`
											: rect.slug
												? `article-${rect.slug}`
												: undefined
									}
								>
									<Rectangle {...rect} />
								</motion.div>
							),
						)}
					</AnimatePresence>
				</div>
			</div>

			<ModalProvider />
		</>
	);
}

export default App;
