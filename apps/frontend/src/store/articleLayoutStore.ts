import { create } from "zustand";
import type { RectangleProps } from "../components/Rectangle";
import { loadArticlesAsRectangles } from "../utils/articleParser";
import { autoLayout, type LayoutItem } from "../utils/layoutAlgorithm";

interface ArticleLayoutState {
	rawRectangles: RectangleProps[];
	layoutRectangles: LayoutItem[];
	searchTerm: string;
	setSearchTerm: (term: string) => void;
}

// 预先加载文章并计算布局，保持渲染时可复用
const rawRectangles = loadArticlesAsRectangles();

// 布局缓存：避免重复计算相同搜索词的布局
const layoutCache = new Map<string, LayoutItem[]>();

const buildLayout = (term: string) => {
	const normalized = term.trim().toLowerCase();

	// 检查缓存
	if (layoutCache.has(normalized)) {
		return layoutCache.get(normalized)!;
	}

	const filtered = normalized
		? rawRectangles.filter((article) => {
				const haystack = `${article.title || ""} ${article.content || ""}`.toLowerCase();
				return haystack.includes(normalized);
			})
		: rawRectangles;

	const layout = autoLayout(filtered);

	// 存入缓存（限制缓存大小，避免内存泄漏）
	if (layoutCache.size > 50) {
		const firstKey = layoutCache.keys().next().value;
		if (firstKey !== undefined) {
			layoutCache.delete(firstKey);
		}
	}
	layoutCache.set(normalized, layout);

	return layout;
};

const layoutRectangles = rawRectangles.length > 0 ? autoLayout(rawRectangles) : [];

export const useArticleLayoutStore = create<ArticleLayoutState>((set) => ({
	rawRectangles,
	layoutRectangles,
	searchTerm: "",
	setSearchTerm: (term: string) =>
		set((state) => {
			if (term === state.searchTerm) return state;
			return { searchTerm: term, layoutRectangles: buildLayout(term) };
		}),
}));
