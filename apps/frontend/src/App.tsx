import "./App.css";
import { Rectangle, type RectangleProps } from "./components/Rectangle";
import { autoLayout } from "./utils/layoutAlgorithm";
import { useMemo } from "react";

// 原始数据（可以是打乱顺序的）
const rawRectangles: RectangleProps[] = [
	{
		importance: 4,
		color: "bg-rose-100",
		title: "创意",
		timestamp: Date.now() - 3600000, // 1小时前
	},
	{
		importance: 1,
		color: "bg-blue-100",
		title: "探索",
		description: "发现新世界的无限可能",
		timestamp: Date.now(), // 最新
	},
	{
		importance: 2,
		color: "bg-cyan-100",
		title: "创新",
		description: "突破传统的边界",
		timestamp: Date.now() - 7200000, // 2小时前
	},
	{
		importance: 3,
		color: "bg-emerald-100",
		title: "成长",
		description: "持续进步",
		timestamp: Date.now() - 1800000, // 30分钟前
	},
	{
		importance: 1,
		color: "bg-indigo-100",
		title: "未来",
		description: "无限可能等待探索",
		timestamp: Date.now() - 10800000, // 3小时前
	},
	{
		importance: 2,
		color: "bg-amber-100",
		title: "灵感",
		description: "捕捉每一个闪光时刻",
		timestamp: Date.now() - 900000, // 15分钟前
	},
	{
		importance: 3,
		color: "bg-purple-100",
		title: "梦想",
		description: "勇敢追寻",
		timestamp: Date.now() - 5400000, // 1.5小时前
	},
	{
		importance: 4,
		color: "bg-pink-100",
		title: "热情",
		timestamp: Date.now() - 14400000, // 4小时前
	},
	{
		importance: 2,
		color: "bg-teal-100",
		title: "平衡",
		description: "寻找内心的和谐",
		timestamp: Date.now() - 2700000, // 45分钟前
	},
	{
		importance: 4,
		color: "bg-lime-100",
		title: "活力",
		timestamp: Date.now() - 4500000, // 1小时15分钟前
	},
	{
		importance: 1,
		color: "bg-orange-100",
		title: "激情",
		description: "点燃生命的火焰",
		timestamp: Date.now() - 600000, // 10分钟前
	},
	{
		importance: 3,
		color: "bg-red-100",
		title: "勇气",
		description: "无畏前行",
		timestamp: Date.now() - 8100000, // 2小时15分钟前
	},
	{
		importance: 2,
		color: "bg-violet-100",
		title: "智慧",
		description: "知识与经验的结晶",
		timestamp: Date.now() - 1200000, // 20分钟前
	},
	{
		importance: 4,
		color: "bg-fuchsia-100",
		title: "魅力",
		timestamp: Date.now() - 10000000, // 2小时47分钟前
	},
	{
		importance: 1,
		color: "bg-sky-100",
		title: "自由",
		description: "像天空一样辽阔",
		timestamp: Date.now() - 300000, // 5分钟前
	},
	{
		importance: 3,
		color: "bg-slate-200",
		title: "沉稳",
		description: "稳健前进",
		timestamp: Date.now() - 6300000, // 1小时45分钟前
	},
	{
		importance: 2,
		color: "bg-yellow-100",
		title: "希望",
		description: "照亮前行的道路",
		timestamp: Date.now() - 150000, // 2.5分钟前
	},
	{
		importance: 4,
		color: "bg-green-100",
		title: "生机",
		timestamp: Date.now() - 4000000, // 1小时6分钟前
	},
	{
		importance: 1,
		color: "bg-rose-200",
		title: "温柔",
		description: "细腻而温暖的力量",
		timestamp: Date.now() - 12000000, // 3小时20分钟前
	},
	{
		importance: 3,
		color: "bg-blue-200",
		title: "深邃",
		description: "探索未知",
		timestamp: Date.now() - 2100000, // 35分钟前
	},
	{
		importance: 2,
		color: "bg-indigo-200",
		title: "专注",
		description: "心无旁骛的力量",
		timestamp: Date.now() - 500000, // 8分钟前
	},
	{
		importance: 4,
		color: "bg-purple-200",
		title: "神秘",
		timestamp: Date.now() - 9000000, // 2小时30分钟前
	},
];

function App() {
	// 使用布局算法自动排序
	const rectangles = useMemo(() => autoLayout(rawRectangles), []);

	return (
		<div className="bg-white overflow-hidden">
			<div className="grid grid-cols-4 grid-rows-4 gap-[1px] bg-gray-300">
				{rectangles.map((rect, index) => (
					<Rectangle key={`rectangle-${index}-${rect.title}`} {...rect} />
				))}
			</div>
		</div>
	);
}

export default App;
