import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate, useParams } from "react-router";
import { Rectangle } from "./components/Rectangle";
import { WebsiteInfoCard } from "./components/WebsiteInfoCard";
import { WelcomeCard } from "./components/WelcomeCard";
import { ArticleModal } from "./components/ArticleModal";
import { NavigationCard } from "./components/NavigationCard";
import { useArticleLayoutStore } from "./store/articleLayoutStore";
import type { MediaItem } from "./utils/articleParser";
import type { LayoutItem } from "./utils/layoutAlgorithm";
import "./App.css";

function App() {
	const [selectedArticle, setSelectedArticle] = useState<{
		id?: string;
		content: string;
		title?: string;
		author?: string;
		timestamp?: number;
		gallery?: MediaItem[];
		originRect: DOMRect | null;
	} | null>(null);

	const layoutRectangles = useArticleLayoutStore(
		(state) => state.layoutRectangles,
	);
	const rawRectangles = useArticleLayoutStore((state) => state.rawRectangles);
	const setSearchTerm = useArticleLayoutStore((state) => state.setSearchTerm);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const scrollTargetRef = useRef(0);
	const searchResetRef = useRef(false);
	const closingRef = useRef(false);
	const { articleId } = useParams<{ articleId?: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const [pendingArticleId, setPendingArticleId] = useState<string | null>(
		articleId ?? null,
	);

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

	const openArticleFromRect = useCallback(
		(rect: LayoutItem, originRect: DOMRect | null) => {
			const articlePath =
				rect.id || rect.slug ? `/${rect.id ?? rect.slug}` : null;
			if (articlePath && location.pathname !== articlePath) {
				navigate(articlePath);
			}

			setSelectedArticle({
				id: rect.id ?? rect.slug,
				content: rect.content || "",
				title: rect.title,
				author: rect.author,
				timestamp: rect.timestamp,
				gallery: rect.gallery,
				originRect,
			});
		},
		[navigate, location.pathname],
	);

	const handleModalClose = useCallback(() => {
		closingRef.current = true;
		setPendingArticleId(null);
		setSelectedArticle(null);
		if (location.pathname !== "/") {
			navigate("/", { replace: true });
		}
	}, [navigate, location.pathname]);

	const attemptOpenArticleById = useCallback(
		(id: string) => {
			const matchedInLayout =
				layoutRectangles.find((item) => item.id === id || item.slug === id) ??
				null;

			if (!matchedInLayout) {
				const existsInRaw = rawRectangles.find(
					(item) => item.id === id || item.slug === id,
				);

				// 如果文章存在但当前过滤掉了，清空搜索条件等待重新布局后再尝试
				if (existsInRaw && !searchResetRef.current) {
					searchResetRef.current = true;
					setSearchTerm("");
				}
				return false;
			}

			searchResetRef.current = false;
			const elementKey = matchedInLayout.id ?? matchedInLayout.slug;
			const targetElement = elementKey
				? document.getElementById(`article-${elementKey}`)
				: null;

			if (targetElement && scrollContainerRef.current) {
				const container = scrollContainerRef.current;
				const elementRect = targetElement.getBoundingClientRect();
				const containerRect = container.getBoundingClientRect();
				const offsetTop =
					elementRect.top - containerRect.top + container.scrollTop;
				const targetScrollTop =
					offsetTop - container.clientHeight / 2 + elementRect.height / 2;

				container.scrollTo({ top: targetScrollTop, behavior: "smooth" });

				window.setTimeout(() => {
					const originRect = targetElement.getBoundingClientRect();
					openArticleFromRect(matchedInLayout, originRect);
				}, 220);
			} else {
				openArticleFromRect(matchedInLayout, null);
			}

			return true;
		},
		[layoutRectangles, openArticleFromRect, rawRectangles, setSearchTerm],
	);

	useEffect(() => {
		// 关闭流程中且路由尚未切回根路径时跳过，防止立即重开
		if (closingRef.current && articleId) return;
		if (!articleId && closingRef.current) {
			closingRef.current = false;
		}

		if (articleId && selectedArticle?.id === articleId) return;
		setPendingArticleId(articleId ?? null);
	}, [articleId, selectedArticle?.id]);

	useEffect(() => {
		if (!pendingArticleId) return;

		const existsInRaw = rawRectangles.some(
			(item) => item.id === pendingArticleId || item.slug === pendingArticleId,
		);

		if (!existsInRaw) {
			setPendingArticleId(null);
			if (articleId) {
				navigate("/", { replace: true });
			}
			return;
		}

		const opened = attemptOpenArticleById(pendingArticleId);
		if (opened) {
			setPendingArticleId(null);
		}
	}, [
		articleId,
		attemptOpenArticleById,
		navigate,
		pendingArticleId,
		rawRectangles,
	]);

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
									buttons={rect.navigationButtons || []}
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
									<Rectangle
										{...rect}
										onClick={
											rect.content
												? (e) => {
														const target = e.currentTarget;
														const domRect = target.getBoundingClientRect();
														openArticleFromRect(rect, domRect);
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
				onClose={handleModalClose}
				originRect={selectedArticle?.originRect || null}
			/>
		</>
	);
}

export default App;
