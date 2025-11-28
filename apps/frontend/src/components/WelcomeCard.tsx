import { MorphingText } from "./ui/morphing-text";
import { useThemeStore } from "../store/themeStore";

const welcomeTexts = [
	"欢迎来到MikuNews",
	"这里还在积极建设中......",
	"请大家多多投稿",
	"感谢你的支持！",
];

const fontFamily = "ZiHunBianTaoTi";
const fontUrl = "/fonts/ZiHunBianTaoTi/ZiHunBianTaoTi-2.ttf";

export const WelcomeCard = () => {
	const isDarkMode = useThemeStore((state) => state.isDarkMode);
	const bgColor = !isDarkMode ? "#000000" : "#FFFFFF";

	// 动态加载自定义字体
	const style = document.createElement("style");
	style.textContent = `
		@font-face {
			font-family: '${fontFamily}';
			src: url('${fontUrl}') format('truetype');
			font-weight: normal;
			font-style: normal;
		}
	`;
	if (!document.head.querySelector(`style[data-font="${fontFamily}"]`)) {
		style.setAttribute("data-font", fontFamily);
		document.head.appendChild(style);
	}

	return (
		<div
			className="flex items-center justify-center p-6 relative overflow-hidden"
			style={{
				backgroundColor: bgColor,
				gridColumn: "span 2",
				gridRow: "span 1",
				height: "25vh",
			}}
		>
			<MorphingText
				texts={welcomeTexts}
				className={`h-10 text-[24pt] md:h-12 lg:text-[32pt] font-[DeYiHei,sans-serif] ${!isDarkMode ? "text-white" : "text-gray-900"}`}
			/>
		</div>
	);
};
