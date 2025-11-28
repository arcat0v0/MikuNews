import { useThemeStore } from "../store/themeStore";
import type { NavigationButton } from "../utils/layoutAlgorithm";

export interface NavigationCardProps {
	importance?: 0 | 1 | 2 | 3 | 4; // 重要程度：0=整行宽高一半, 1=宽高各占一半, 2=宽一半高1/4, 3=宽1/4高一半, 4=各占1/4
	buttons: NavigationButton[];
}

const getSpanFromImportance = (imp: 0 | 1 | 2 | 3 | 4) => {
	const spanMap = {
		0: { colSpan: 4, rowSpan: 2 }, // 整行，高一半
		1: { colSpan: 2, rowSpan: 2 }, // 宽高各占一半
		2: { colSpan: 2, rowSpan: 1 }, // 宽一半，高1/4
		3: { colSpan: 1, rowSpan: 2 }, // 宽1/4，高一半
		4: { colSpan: 1, rowSpan: 1 }, // 各占1/4
	};
	return spanMap[imp];
};

export const NavigationCard = ({
	importance = 2,
	buttons,
}: NavigationCardProps) => {
	const isDarkMode = useThemeStore((state) => state.isDarkMode);
	const { colSpan, rowSpan } = getSpanFromImportance(importance);

	return (
		<div
			className="relative overflow-hidden bg-white dark:bg-black "
			style={{
				gridColumn: `span ${colSpan}`,
				gridRow: `span ${rowSpan}`,
				height:
					importance === 0 || importance === 1 || importance === 3
						? "50vh"
						: "25vh",
			}}
			data-dark-mode={isDarkMode ? "true" : "false"}
		>
			<div className="relative z-10 h-full w-full flex items-center justify-center gap-4">
				{buttons.map((btn) => (
					<a
						key={`${btn.label}-${btn.href}`}
						href={btn.href}
						className="px-5 py-2 rounded-full dark:border-gray-700/80 text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-white/10"
					>
						{btn.label}
					</a>
				))}
			</div>
		</div>
	);
};
