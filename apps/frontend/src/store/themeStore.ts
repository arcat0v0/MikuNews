import { create } from "zustand";

interface ThemeState {
	isDarkMode: boolean;
}

export const useThemeStore = create<ThemeState>((set) => {
	const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	const handler = (e: MediaQueryListEvent) => {
		set({ isDarkMode: e.matches });
	};

	darkModeMediaQuery.addEventListener("change", handler);

	return {
		isDarkMode: darkModeMediaQuery.matches,
	};
});
