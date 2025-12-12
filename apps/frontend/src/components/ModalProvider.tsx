import { useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { useModalStore } from "../store/modalStore";
import { useArticleLayoutStore } from "../store/articleLayoutStore";
import { ArticleModal } from "./ArticleModal";

export const ModalProvider = () => {
	const { articleId } = useParams<{ articleId?: string }>();
	const navigate = useNavigate();
	const location = useLocation();

	const selectedArticle = useModalStore((state) => state.selectedArticle);
	const openArticle = useModalStore((state) => state.openArticle);
	const closeArticle = useModalStore((state) => state.closeArticle);

	const layoutRectangles = useArticleLayoutStore(
		(state) => state.layoutRectangles,
	);
	const rawRectangles = useArticleLayoutStore((state) => state.rawRectangles);
	const setSearchTerm = useArticleLayoutStore((state) => state.setSearchTerm);

	const closingRef = useRef(false);
	const searchResetRef = useRef(false);

	// 处理模态框关闭
	const handleModalClose = useCallback(() => {
		closingRef.current = true;
		closeArticle();
		if (location.pathname !== "/") {
			navigate("/", { replace: true });
		}
	}, [closeArticle, navigate, location.pathname]);

	// 尝试通过 ID 打开文章
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

			if (targetElement) {
				const container = document.querySelector(".overflow-y-auto");
				if (container) {
					const elementRect = targetElement.getBoundingClientRect();
					const containerRect = container.getBoundingClientRect();
					const offsetTop =
						elementRect.top - containerRect.top + container.scrollTop;
					const targetScrollTop =
						offsetTop - container.clientHeight / 2 + elementRect.height / 2;

					container.scrollTo({ top: targetScrollTop, behavior: "smooth" });

					window.setTimeout(() => {
						const originRect = targetElement.getBoundingClientRect();
						openArticle({
							id: matchedInLayout.id ?? matchedInLayout.slug,
							content: matchedInLayout.content || "",
							title: matchedInLayout.title,
							author: matchedInLayout.author,
							timestamp: matchedInLayout.timestamp,
							gallery: matchedInLayout.gallery,
							useNineGrid: matchedInLayout.useNineGrid,
							originRect,
						});
					}, 220);
				}
			} else {
				openArticle({
					id: matchedInLayout.id ?? matchedInLayout.slug,
					content: matchedInLayout.content || "",
					title: matchedInLayout.title,
					author: matchedInLayout.author,
					timestamp: matchedInLayout.timestamp,
					gallery: matchedInLayout.gallery,
					useNineGrid: matchedInLayout.useNineGrid,
					originRect: null,
				});
			}

			return true;
		},
		[layoutRectangles, openArticle, rawRectangles, setSearchTerm],
	);

	// 当 URL 中有 articleId 时，尝试打开对应文章
	useEffect(() => {
		// 关闭流程中且路由尚未切回根路径时跳过，防止立即重开
		if (closingRef.current && articleId) return;
		if (!articleId && closingRef.current) {
			closingRef.current = false;
		}

		if (articleId && selectedArticle?.id === articleId) return;

		if (articleId) {
			const existsInRaw = rawRectangles.some(
				(item) => item.id === articleId || item.slug === articleId,
			);

			if (!existsInRaw) {
				if (articleId) {
					navigate("/", { replace: true });
				}
				return;
			}

			attemptOpenArticleById(articleId);
		}
	}, [
		articleId,
		selectedArticle?.id,
		rawRectangles,
		navigate,
		attemptOpenArticleById,
	]);

	// 当模态框打开时，更新 URL
	useEffect(() => {
		if (selectedArticle?.id && location.pathname === "/") {
			navigate(`/${selectedArticle.id}`, { replace: true });
		}
	}, [selectedArticle?.id, location.pathname, navigate]);

	return (
		<ArticleModal
			content={selectedArticle?.content || ""}
			title={selectedArticle?.title}
			author={selectedArticle?.author}
			timestamp={selectedArticle?.timestamp}
			gallery={selectedArticle?.gallery}
			useNineGrid={selectedArticle?.useNineGrid}
			isOpen={!!selectedArticle}
			onClose={handleModalClose}
			originRect={selectedArticle?.originRect || null}
		/>
	);
};
