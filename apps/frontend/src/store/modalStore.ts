import { create } from "zustand";
import type { MediaItem } from "../utils/articleParser";

interface ArticleModalData {
	id?: string;
	content: string;
	title?: string;
	author?: string;
	timestamp?: number;
	gallery?: MediaItem[];
	originRect: DOMRect | null;
}

interface ModalState {
	selectedArticle: ArticleModalData | null;
	openArticle: (article: ArticleModalData) => void;
	closeArticle: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
	selectedArticle: null,
	openArticle: (article) => set({ selectedArticle: article }),
	closeArticle: () => set({ selectedArticle: null }),
}));
