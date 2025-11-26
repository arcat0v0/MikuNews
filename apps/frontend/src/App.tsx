import "./App.css";
import { Rectangle, type RectangleProps } from "./components/Rectangle";
import { autoLayout } from "./utils/layoutAlgorithm";
import { useMemo } from "react";

// 原始数据（可以是打乱顺序的）
const rawRectangles: RectangleProps[] = [
	{
		colSpan: 1,
		rowSpan: 1,
		colorFrom: "rose-100",
		colorTo: "rose-50",
		hoverFrom: "rose-200",
		hoverTo: "rose-100",
		title: "创意",
		timestamp: Date.now() - 3600000, // 1小时前
	},
	{
		colSpan: 2,
		rowSpan: 2,
		colorFrom: "blue-100",
		colorTo: "blue-50",
		hoverFrom: "blue-200",
		hoverTo: "blue-100",
		title: "探索",
		description: "发现新世界的无限可能",
		timestamp: Date.now(), // 最新
	},
	{
		colSpan: 2,
		rowSpan: 1,
		colorFrom: "cyan-100",
		colorTo: "cyan-50",
		hoverFrom: "cyan-200",
		hoverTo: "cyan-100",
		title: "创新",
		description: "突破传统的边界",
		timestamp: Date.now() - 7200000, // 2小时前
	},
	{
		colSpan: 1,
		rowSpan: 2,
		colorFrom: "emerald-100",
		colorTo: "emerald-50",
		hoverFrom: "emerald-200",
		hoverTo: "emerald-100",
		title: "成长",
		description: "持续进步",
		timestamp: Date.now() - 1800000, // 30分钟前
	},
	{
		colSpan: 2,
		rowSpan: 2,
		colorFrom: "indigo-100",
		colorTo: "indigo-50",
		hoverFrom: "indigo-200",
		hoverTo: "indigo-100",
		title: "未来",
		description: "无限可能等待探索",
		timestamp: Date.now() - 10800000, // 3小时前
	},
	{
		colSpan: 2,
		rowSpan: 1,
		colorFrom: "amber-100",
		colorTo: "amber-50",
		hoverFrom: "amber-200",
		hoverTo: "amber-100",
		title: "灵感",
		description: "捕捉每一个闪光时刻",
		timestamp: Date.now() - 900000, // 15分钟前
	},
	{
		colSpan: 1,
		rowSpan: 2,
		colorFrom: "purple-100",
		colorTo: "purple-50",
		hoverFrom: "purple-200",
		hoverTo: "purple-100",
		title: "梦想",
		description: "勇敢追寻",
		timestamp: Date.now() - 5400000, // 1.5小时前
	},
	{
		colSpan: 1,
		rowSpan: 1,
		colorFrom: "pink-100",
		colorTo: "pink-50",
		hoverFrom: "pink-200",
		hoverTo: "pink-100",
		title: "热情",
		timestamp: Date.now() - 14400000, // 4小时前
	},
];

function App() {
	// 使用布局算法自动排序和验证布局
	const rectangles = useMemo(() => autoLayout(rawRectangles), []);

	return (
		<div className="w-screen h-screen bg-white overflow-hidden">
			<div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-[1px] bg-gray-300">
				{rectangles.map((rect, index) => (
					<Rectangle key={`rectangle-${index}-${rect.title}`} {...rect} />
				))}
			</div>
		</div>
	);
}

export default App;
