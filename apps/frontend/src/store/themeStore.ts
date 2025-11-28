import { create } from "zustand";

interface ThemeState {
	isDarkMode: boolean;
}

const applyDarkClass = (isDark: boolean) => {
	if (typeof document !== "undefined") {
		document.documentElement.classList.toggle("dark", isDark);
	}
};

const getDarkModeMediaQuery = () => {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
		return null;
	}
	return window.matchMedia("(prefers-color-scheme: dark)");
};

const darkModeMediaQuery = getDarkModeMediaQuery();
const initialIsDark = darkModeMediaQuery?.matches ?? false;
applyDarkClass(initialIsDark);

export const useThemeStore = create<ThemeState>((set) => {
	const query = darkModeMediaQuery ?? getDarkModeMediaQuery();

	const handler = (e: MediaQueryListEvent) => {
		applyDarkClass(e.matches);
		set({ isDarkMode: e.matches });
	};

	// 初始化时同步一次 .dark 类，保证 Tailwind 的 dark: 样式生效
	applyDarkClass(query?.matches ?? false);
	query?.addEventListener("change", handler);

	return {
		isDarkMode: query?.matches ?? false,
	};
});
