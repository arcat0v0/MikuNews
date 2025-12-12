import { create } from "zustand";
import type { MediaItem } from "@mikunews/models";

interface ArticleModalData {
	id?: string;
	content: string;
	title?: string;
	author?: string;
	timestamp?: number;
	gallery?: MediaItem[];
	useNineGrid?: boolean;
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
