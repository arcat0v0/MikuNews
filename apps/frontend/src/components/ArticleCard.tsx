import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface ArticleCardProps {
	content: string;
	className?: string;
}

export const ArticleCard = ({ content, className = "" }: ArticleCardProps) => {
	return (
		<article
			className={`
				bg-white dark:bg-[rgb(18,18,18)]
				text-gray-900 dark:text-white
				rounded-2xl
				shadow-lg
				p-8
				transition-colors duration-200
				prose prose-lg dark:prose-invert max-w-none
				prose-headings:font-semibold
				prose-h1:text-4xl prose-h1:mb-6
				prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8
				prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6
				prose-p:mb-4 prose-p:leading-relaxed
				prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
				prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
				prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800 prose-pre:p-4 prose-pre:rounded-lg
				prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic
				prose-ul:list-disc prose-ul:ml-6
				prose-ol:list-decimal prose-ol:ml-6
				prose-li:mb-2
				prose-img:rounded-lg prose-img:shadow-md
				prose-table:border-collapse prose-table:w-full
				prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:p-2 prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600
				prose-td:p-2 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600
				${className}
			`}
			style={{ fontFamily: "sans-serif" }}
		>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
		</article>
	);
};
