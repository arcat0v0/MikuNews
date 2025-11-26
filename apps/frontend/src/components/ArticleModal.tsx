import { useEffect } from "react";
import { ArticleCard } from "./ArticleCard";

export interface ArticleModalProps {
	content: string;
	isOpen: boolean;
	onClose: () => void;
}

export const ArticleModal = ({
	content,
	isOpen,
	onClose,
}: ArticleModalProps) => {
	// ESC 键关闭模态框
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			// 防止背景滚动
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "";
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleBackdropClick = (e: React.MouseEvent) => {
		// 只有点击背景层时才关闭
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
			onClick={handleBackdropClick}
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					onClose();
				}
			}}
			role="dialog"
			aria-modal="true"
		>
			{/* 关闭按钮 */}
			<button
				type="button"
				onClick={onClose}
				className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-[rgb(18,18,18)] text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors shadow-lg"
				aria-label="关闭"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>

			<div className="relative w-full max-w-[50vw] h-[80vh] flex flex-col">
				{/* 滚动内容区域 */}
				<div className="overflow-y-auto flex-1 h-full">
					<ArticleCard content={content} className="shadow-2xl min-h-full" />
				</div>
			</div>
		</div>
	);
};
