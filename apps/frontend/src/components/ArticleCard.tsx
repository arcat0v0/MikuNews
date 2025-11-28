import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { ExternalLink, User } from "lucide-react";
import { formatTimestamp } from "../utils/dateFormatter";
import { MediaGallery } from "./MediaGallery";
import type { MediaItem } from "../utils/articleParser";

export interface ArticleCardProps {
	content: string;
	title?: string;
	author?: string;
	timestamp?: number;
	gallery?: MediaItem[];
	className?: string;
}

const markdownComponents: Components = {
	a: ({ node: _node, className, children, ...props }) => (
		<a
			{...props}
			target="_blank"
			rel="noopener noreferrer"
			className={`inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 ${className ?? ""}`.trim()}
		>
			<span>{children}</span>
			<ExternalLink className="h-4 w-4" aria-hidden />
		</a>
	),
};

export const ArticleCard = ({
	content,
	title,
	author,
	timestamp,
	gallery,
	className = "",
}: ArticleCardProps) => {
	const hasGallery = gallery && gallery.length > 0;

	return (
		<article
			className={`
				bg-white dark:bg-[rgb(18,18,18)]
				text-gray-900 dark:text-white
				rounded-2xl
				shadow-lg
				transition-colors duration-200
				relative
				overflow-hidden
				w-full lg:max-w-6xl
				mx-auto
				h-full
				${className}
			`}
			style={{ fontFamily: "sans-serif" }}
		>
			{/* 主内容区域 - 左右布局 */}
			<div
				className={`h-full ${
					hasGallery
						? "flex flex-col lg:grid lg:grid-cols-[520px_1fr] min-h-[360px] lg:min-h-[480px]"
						: "flex flex-col"
				}`}
			>
				{/* 左侧：媒体画廊 */}
				{hasGallery && (
					<div className="w-full lg:h-full lg:relative h-[360px]">
						<MediaGallery
							media={gallery}
							className="h-full w-full lg:absolute lg:inset-0 rounded-none!"
						/>
					</div>
				)}

				{/* 右侧：文章内容 */}
				<div
					className={`flex-1 flex flex-col min-w-0 ${
						hasGallery ? "p-6 lg:p-8" : "p-8"
					}`}
				>
					{/* 标题区域 */}
					{title && (
						<div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
							<h1 className="text-3xl font-bold mb-2">{title}</h1>
							{/* 作者信息 */}
							{author && (
								<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
									<User className="h-5 w-5" />
									<span className="font-medium">{author}</span>
								</div>
							)}
						</div>
					)}

					{/* 文章内容 */}
					<div
						className={`
							prose prose-lg dark:prose-invert max-w-none
							prose-headings:font-semibold
							prose-h1:text-4xl prose-h1:mb-8
							prose-h2:text-3xl prose-h2:mb-6 prose-h2:mt-10
							prose-h3:text-2xl prose-h3:mb-4 prose-h3:mt-8
							prose-p:mb-6 prose-p:leading-relaxed
							prose-a:text-blue-600 dark:prose-a:text-blue-400
							prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
							prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-4 prose-pre:rounded-lg prose-pre:mb-6
							prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-6
							prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-6
							prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-6
							prose-li:mb-2
							prose-img:rounded-lg prose-img:shadow-md prose-img:my-6
							prose-table:border-collapse prose-table:w-full prose-table:mb-6
							prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:p-2 prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600
							prose-td:p-2 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600
						`}
					>
						<ReactMarkdown
							remarkPlugins={[remarkGfm]}
							rehypePlugins={[rehypeRaw]}
							components={markdownComponents}
						>
							{content}
						</ReactMarkdown>
					</div>

					{/* 时间信息 - 右下角 */}
					{timestamp && (
						<div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
							<time className="text-sm text-gray-500 dark:text-gray-400">
								{formatTimestamp(timestamp)}
							</time>
						</div>
					)}
				</div>
			</div>
		</article>
	);
};
