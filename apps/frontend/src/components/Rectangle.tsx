export interface RectangleProps {
	colSpan: number;
	rowSpan: number;
	colorFrom: string;
	colorTo: string;
	hoverFrom: string;
	hoverTo: string;
	title: string;
	description?: string;
	fontUrl?: string;
	fontFamily?: string;
	backgroundImage?: string;
	backgroundVideo?: string;
	textColor?: string;
	descriptionColor?: string;
	timestamp?: number; // 时间戳，用于排序
}

export const Rectangle = ({
	colSpan,
	rowSpan,
	colorFrom,
	colorTo,
	hoverFrom,
	hoverTo,
	title,
	description,
	fontUrl,
	fontFamily,
	backgroundImage,
	backgroundVideo,
	textColor,
	descriptionColor,
	timestamp,
}: RectangleProps) => {
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

	return (
		<div
			className={`group bg-linear-to-br from-${colorFrom} to-${colorTo} hover:from-${hoverFrom} hover:to-${hoverTo} transition-colors duration-300 flex items-center justify-center p-6 relative overflow-hidden`}
			style={{
				gridColumn: `span ${colSpan}`,
				gridRow: `span ${rowSpan}`,
			}}
		>
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
				></div>
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
		</div>
	);
};
