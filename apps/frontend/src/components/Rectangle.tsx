export interface RectangleProps {
	importance?: 1 | 2 | 3 | 4; // 重要程度：1=宽高各占一半, 2=宽一半高1/4, 3=宽1/4高一半, 4=各占1/4
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
	content?: string; // Markdown 文章内容
	slug?: string; // 文章唯一标识
	onClick?: () => void; // 点击事件处理器
}

export const Rectangle = ({
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
	content: _content, // 保留用于传递，但组件本身不使用
	slug: _slug, // 保留用于传递，但组件本身不使用
	onClick,
}: RectangleProps) => {
	// 根据重要程度计算 colSpan 和 rowSpan
	const getSpanFromImportance = (imp: 1 | 2 | 3 | 4) => {
		const spanMap = {
			1: { colSpan: 2, rowSpan: 2 }, // 宽高各占一半
			2: { colSpan: 2, rowSpan: 1 }, // 宽一半，高1/4
			3: { colSpan: 1, rowSpan: 2 }, // 宽1/4，高一半
			4: { colSpan: 1, rowSpan: 1 }, // 各占1/4
		};
		return spanMap[imp];
	};

	const { colSpan, rowSpan } = getSpanFromImportance(importance);
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

	const useFontFamily = fontFamily || "PingFangLaiJiangHu, sans-serif";
	const titleColor = textColor || "text-gray-900/60";
	const descColor = descriptionColor || textColor || "text-gray-800/50";

	// 格式化时间戳为本地时间
	const formatTimestamp = (ts?: number) => {
		if (!ts) return "";
		return new Date(ts).toLocaleString(undefined, {
			dateStyle: "medium",
			timeStyle: "short",
		});
	};

	// 公共样式
	const commonClassName =
		"group hover:opacity-90 transition-opacity duration-300 flex items-center justify-center p-6 relative overflow-hidden";
	const commonStyle = {
		backgroundColor: color,
		gridColumn: `span ${colSpan}`,
		gridRow: `span ${rowSpan}`,
		height:
			importance === 1
				? "50vh"
				: importance === 2
					? "25vh"
					: importance === 3
						? "50vh"
						: "25vh",
	};

	// 公共内容
	const content = (
		<>
			{/* 背景视频 */}
			{backgroundVideo && (
				<video
					autoPlay
					loop
					muted
					playsInline
					className="absolute inset-0 w-full h-full object-cover"
				>
					<source src={backgroundVideo} type="video/mp4" />
				</video>
			)}

			{/* 背景图片 */}
			{!backgroundVideo && backgroundImage && (
				<div
					className="absolute inset-0 w-full h-full bg-cover bg-center"
					style={{ backgroundImage: `url(${backgroundImage})` }}
				/>
			)}

			{/* 内容层 */}
			<div
				className="text-center relative z-10"
				style={{ fontFamily: useFontFamily }}
			>
				<h2
					className={`text-7xl font-semibold ${titleColor} group-hover:text-gray-900 transition-colors duration-300 mb-2`}
				>
					{title}
				</h2>
				{description && (
					<p
						className={`text-2xl font-medium ${descColor} group-hover:text-gray-800 transition-colors duration-300`}
					>
						{description}
					</p>
				)}
				{/* 时间信息，使用系统默认字体 */}
				{timestamp && (
					<p
						className="text-sm text-gray-500/70 group-hover:text-gray-600 transition-colors duration-300 mt-2"
						style={{ fontFamily: "sans-serif" }}
					>
						{formatTimestamp(timestamp)}
					</p>
				)}
			</div>
		</>
	);

	// 如果有 onClick，渲染 button；否则渲染 div
	if (onClick) {
		return (
			<button
				type="button"
				className={commonClassName}
				style={{
					...commonStyle,
					cursor: "pointer",
					border: "none",
					font: "inherit",
					textAlign: "inherit",
				}}
				onClick={onClick}
			>
				{content}
			</button>
		);
	}

	return (
		<div className={commonClassName} style={commonStyle}>
			{content}
		</div>
	);
};
