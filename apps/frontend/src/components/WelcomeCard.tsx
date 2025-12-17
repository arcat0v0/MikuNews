import { memo } from "react";
import { MorphingText } from "./ui/morphing-text";
import { useThemeStore } from "../store/themeStore";

const welcomeTexts = [
	"欢迎来到MikuNews",
	"这里还在积极建设中......",
	"请大家多多投稿",
	"感谢你的支持！",
];

const WelcomeCardComponent = () => {
	const isDarkMode = useThemeStore((state) => state.isDarkMode);

	return (
		<div
			className="flex items-center justify-center p-6 relative overflow-hidden bg-white dark:bg-black"
			style={{
				gridColumn: "span 2",
				gridRow: "span 1",
				height: "25vh",
			}}
			data-dark-mode={isDarkMode ? "true" : "false"}
		>
			<MorphingText
				texts={welcomeTexts}
				className="h-10 text-[24pt] md:h-12 lg:text-[32pt] font-[DeYiHei,sans-serif] text-gray-900 dark:text-white"
			/>
		</div>
	);
};

// 使用 memo 优化组件
export const WelcomeCard = memo(WelcomeCardComponent);
