import { create } from "zustand";
import type { RectangleProps } from "../components/Rectangle";
import { loadArticlesAsRectangles } from "../utils/articleParser";
import { autoLayout, type LayoutItem } from "../utils/layoutAlgorithm";

interface ArticleLayoutState {
	rawRectangles: RectangleProps[];
	layoutRectangles: LayoutItem[];
}

// 预先加载文章并计算布局，保持渲染时可复用
const rawRectangles = loadArticlesAsRectangles();
const layoutRectangles =
	rawRectangles.length > 0 ? autoLayout(rawRectangles) : [];

export const useArticleLayoutStore = create<ArticleLayoutState>(() => ({
	rawRectangles,
	layoutRectangles,
}));
