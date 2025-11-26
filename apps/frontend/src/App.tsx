import { useMemo, useState } from "react";
import { Rectangle, type RectangleProps } from "./components/Rectangle";
import { ArticleModal } from "./components/ArticleModal";
import { loadArticlesAsRectangles } from "./utils/articleParser";
import { autoLayout } from "./utils/layoutAlgorithm";
import "./App.css";

// 在模块顶层同步加载所有文章（编译时已打包）
const rawRectangles: RectangleProps[] = loadArticlesAsRectangles();

function App() {
	const [selectedArticle, setSelectedArticle] = useState<{
		content: string;
	} | null>(null);

	// 使用布局算法自动排序
	const rectangles = useMemo(() => {
		if (rawRectangles.length === 0) return [];
		return autoLayout(rawRectangles);
	}, []);

	if (rectangles.length === 0) {
		return (
			<div className="bg-white overflow-hidden flex items-center justify-center h-screen">
				<div className="text-gray-500">暂无文章</div>
			</div>
		);
	}

	return (
		<>
			<div className="bg-white overflow-hidden">
				<div className="grid grid-cols-4 grid-rows-4 gap-px bg-gray-300">
					{rectangles.map((rect, index) => (
						<Rectangle
							key={`rectangle-${index}-${rect.title}`}
							{...rect}
							onClick={
								rect.content
									? () => setSelectedArticle({ content: rect.content! })
									: undefined
							}
						/>
					))}
				</div>
			</div>

			{/* 文章详情模态框 */}
			<ArticleModal
				content={selectedArticle?.content || ""}
				isOpen={!!selectedArticle}
				onClose={() => setSelectedArticle(null)}
			/>
		</>
	);
}

export default App;
