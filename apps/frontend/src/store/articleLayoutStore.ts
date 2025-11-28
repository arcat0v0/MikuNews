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
const buildLayout = (term: string) => {
	const normalized = term.trim().toLowerCase();
	const filtered = normalized
		? rawRectangles.filter((article) => {
				const haystack = `${article.title || ""} ${article.content || ""}`.toLowerCase();
				return haystack.includes(normalized);
			})
		: rawRectangles;

	return autoLayout(filtered);
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
