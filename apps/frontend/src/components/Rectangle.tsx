import type { MediaItem } from "@mikunews/models";
import { memo, useMemo } from "react";
import { formatTimestamp } from "../utils/dateFormatter";
import { useModalStore } from "../store/modalStore";

export interface RectangleProps {
	importance?: 0 | 1 | 2 | 3 | 4; // 重要程度：0=整行宽高一半, 1=宽高各占一半, 2=宽一半高1/4, 3=宽1/4高一半, 4=各占1/4
	color: string;
	title: string;
	description?: string;
	fontUrl?: string;
	fontFamily?: string;
	backgroundImage?: string;
	backgroundVideo?: string;
	textColor?: string;
	descriptionColor?: string;
	timestamp?: number; // 时间戳，用于排序
	author?: string; // 作者名称
	isTop?: boolean; // 是否置顶
	useNineGrid?: boolean; // 是否使用九宫格媒体布局
	content?: string; // Markdown 文章内容
	slug?: string; // 文章唯一标识
	id?: string; // 文章 ID
	gallery?: MediaItem[]; // 媒体画廊
	isEmpty?: boolean; // 是否为空卡片
}

// 提取 span 计算到组件外部，避免每次渲染都创建新函数
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

const RectangleComponent = ({
	importance = 4,
	color,
	title,
	description,
	fontUrl,
	fontFamily,
	backgroundImage,
	backgroundVideo,
	textColor,
	descriptionColor,
	timestamp,
	author,
	content,
	slug,
	id,
	gallery,
	useNineGrid,
	isEmpty,
}: RectangleProps) => {
	const openArticle = useModalStore((state) => state.openArticle);

	const { colSpan, rowSpan } = useMemo(
		() => getSpanFromImportance(importance),
		[importance],
	);

	// 使用 useMemo 缓存计算结果
	const useFontFamily = useMemo(
		() => fontFamily || "DeYiHei, sans-serif",
		[fontFamily],
	);
	const titleColor = useMemo(
		() => textColor || "text-gray-900/70",
		[textColor],
	);
	const descColor = useMemo(
		() => descriptionColor || textColor || "text-gray-800/50",
		[descriptionColor, textColor],
	);
	const formattedTime = useMemo(
		() => (timestamp ? formatTimestamp(timestamp) : null),
		[timestamp],
	);

	const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (content) {
			const target = e.currentTarget;
			const originRect = target.getBoundingClientRect();
			openArticle({
				id: id ?? slug,
				content,
				title,
				author,
				timestamp,
				gallery,
				useNineGrid,
				originRect,
			});
		}
	};

	// 如果是空卡片，直接渲染纯黑背景
	if (isEmpty) {
		return (
			<div
				className="bg-black"
				style={{
					gridColumn: `span ${colSpan}`,
					gridRow: `span ${rowSpan}`,
					height:
						importance === 0 || importance === 1 || importance === 3
							? "50vh"
							: "25vh",
				}}
			/>
		);
	}

	// 动态加载自定义字体
	if (fontUrl && fontFamily) {
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
	}

	const hasClickHandler = !!content;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: I don't know how to fix it
		<div
			className={
				"group flex items-center justify-center p-6 relative overflow-hidden"
			}
			style={{
				backgroundColor: color,
				gridColumn: `span ${colSpan}`,
				gridRow: `span ${rowSpan}`,
				height:
					importance === 0 || importance === 1 || importance === 3
						? "50vh"
						: "25vh",
				...(hasClickHandler && { cursor: "pointer" }),
			}}
			onClick={hasClickHandler ? handleClick : undefined}
			tabIndex={hasClickHandler ? 0 : undefined}
			onKeyDown={
				hasClickHandler
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
							}
						}
					: undefined
			}
		>
			{/* 背景视频 */}
			{backgroundVideo && (
				<video
					autoPlay
					loop
					muted
					playsInline
					className="absolute inset-0 w-full h-full object-cover transition-[opacity,filter] duration-300 group-hover:opacity-70 group-hover:blur-md"
				>
					<source src={backgroundVideo} type="video/mp4" />
				</video>
			)}

			{/* 背景图片 */}
			{!backgroundVideo && backgroundImage && (
				<div
					className="absolute inset-0 w-full h-full bg-cover bg-center transition-[opacity,filter] duration-300 group-hover:opacity-70 group-hover:blur-md"
					style={{ backgroundImage: `url(${backgroundImage})` }}
				/>
			)}

			{/* 内容层 */}
			<div
				className="text-center relative z-10"
				style={{ fontFamily: useFontFamily }}
			>
				<h2 className={`text-7xl font-semibold ${titleColor} mb-2`}>{title}</h2>
				{description && (
					<p className={`text-2xl font-medium ${descColor}`}>{description}</p>
				)}
				{/* 时间信息，使用系统默认字体 */}
				{formattedTime && (
					<p
						className="text-base text-gray-600/70 mt-2"
						style={{ fontFamily: "sans-serif" }}
					>
						{formattedTime}
					</p>
				)}
			</div>
		</div>
	);
};

// 使用 memo 优化组件
export const Rectangle = memo(RectangleComponent);
