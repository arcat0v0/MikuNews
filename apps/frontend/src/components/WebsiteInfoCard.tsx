import { memo, useMemo } from "react";
import { useThemeStore } from "../store/themeStore";

export interface WebsiteInfoCardProps {
	importance?: 0 | 1 | 2 | 3 | 4; // 重要程度：0=整行宽高一半, 1=宽高各占一半, 2=宽一半高1/4, 3=宽1/4高一半, 4=各占1/4
}

// 提取到组件外部
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

const WebsiteInfoCardComponent = ({ importance = 4 }: WebsiteInfoCardProps) => {
	const isDarkMode = useThemeStore((state) => state.isDarkMode);

	const { colSpan, rowSpan } = useMemo(
		() => getSpanFromImportance(importance),
		[importance],
	);

	return (
		<div
			className="group transition-opacity duration-300 flex items-center justify-center p-6 relative overflow-hidden bg-white dark:bg-black"
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
			{/* 内容层 */}
			<div className="text-center relative z-10 flex flex-col items-center justify-center h-full w-full">
				{/* 网站标题 - 根据卡片大小调整字体 */}
				<h3
					className={`font-bold text-gray-900/90 dark:text-white/90 mb-2 ${
						importance === 4 ? "text-2xl" : "text-3xl"
					}`}
				>
					MikuNews
				</h3>

				{/* 信息容器 */}
				<div className="space-y-1">
					{/* 版权信息 */}
					<p className="text-xs text-gray-800/60 dark:text-white/60">
						© 2025 MikuNews.
					</p>

					{/* 备案号 */}
					<p className="text-[10px] text-gray-800/60 dark:text-white/60">
						ICP备案号：京ICP备20250000号
					</p>

					{/* 在较大的卡片中显示更多信息 */}
					{(importance === 0 || importance === 1 || importance === 3) && (
						<div className="text-[10px] text-gray-800/60 dark:text-white/60 pt-2 space-y-1 border-t border-gray-500/20 mt-2">
							<p>All rights reserved.</p>
							<p>Powered by React & Vite</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

// 使用 memo 优化组件
export const WebsiteInfoCard = memo(WebsiteInfoCardComponent);
