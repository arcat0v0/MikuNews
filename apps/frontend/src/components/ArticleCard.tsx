import type { MediaItem } from "@mikunews/models";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import { ExternalLink, User } from "lucide-react";
import { formatTimestamp } from "../utils/dateFormatter";
import { MediaGallery } from "./MediaGallery";

export interface ArticleCardProps {
	content: string;
	title?: string;
	author?: string;
	timestamp?: number;
	gallery?: MediaItem[];
	useNineGrid?: boolean;
	className?: string;
}

const markdownComponents: Components = {
	a: ({ className, children, ...props }) => (
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

const ArticleCardComponent = ({
	content,
	title,
	author,
	timestamp,
	gallery,
	useNineGrid,
	className = "",
}: ArticleCardProps) => {
	const hasGallery = gallery && gallery.length > 0;

	// 缓存格式化的时间戳
	const formattedTime = useMemo(
		() => (timestamp ? formatTimestamp(timestamp) : null),
		[timestamp],
	);

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
						? "flex flex-col lg:flex-row min-h-[360px] lg:min-h-[480px] lg:items-start"
						: "flex flex-col"
				}`}
			>
				{/* 左侧：媒体画廊 */}
				{hasGallery && (
					<div className="w-1/2 h-full relative">
						<MediaGallery
							media={gallery}
							useNineGrid={useNineGrid}
							className="h-full w-full rounded-none! relative"
						/>
					</div>
				)}

				{/* 右侧：文章内容 */}
				<div
					className={`flex-1 flex flex-col min-w-0 h-full ${
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
					<div className="flex-1 overflow-y-auto min-h-0">
						<div
							className={`
							prose dark:prose-invert max-w-none break-words
							prose-headings:font-semibold
							prose-h1:text-3xl prose-h1:mb-4 prose-h1:leading-tight
							prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-6 prose-h2:leading-tight
							prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4 prose-h3:leading-tight
							prose-p:mb-4 prose-p:leading-7 prose-p:whitespace-pre-wrap
							prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:break-all
							prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-words
							prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-4 prose-pre:rounded-lg prose-pre:mb-4 prose-pre:overflow-x-auto
							prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-4
							prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4 prose-ul:space-y-1
							prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4 prose-ol:space-y-1
							prose-li:leading-7
							prose-img:rounded-lg prose-img:shadow-md prose-img:my-4 prose-img:max-w-full
							prose-table:border-collapse prose-table:w-full prose-table:mb-4
							prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:p-2 prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600
							prose-td:p-2 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:break-words
							prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-white
						`}
						>
							<ReactMarkdown
								remarkPlugins={[remarkGfm, remarkBreaks]}
								rehypePlugins={[rehypeRaw]}
								components={markdownComponents}
							>
								{content}
							</ReactMarkdown>
						</div>
					</div>

					{/* 时间信息 - 右下角 */}
					{formattedTime && (
						<div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
							<time className="text-sm text-gray-500 dark:text-gray-400">
								{formattedTime}
							</time>
						</div>
					)}
				</div>
			</div>
		</article>
	);
};

// 使用 memo 优化组件
export const ArticleCard = memo(ArticleCardComponent);
