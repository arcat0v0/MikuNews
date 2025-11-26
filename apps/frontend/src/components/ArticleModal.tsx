import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import type { MediaItem } from "../utils/articleParser";

export interface ArticleModalProps {
	content: string;
	title?: string;
	author?: string;
	timestamp?: number;
	gallery?: MediaItem[];
	isOpen: boolean;
	onClose: () => void;
	originRect: DOMRect | null;
}

export const ArticleModal = ({
	content,
	title,
	author,
	timestamp,
	gallery,
	isOpen,
	onClose,
	originRect,
}: ArticleModalProps) => {
	const modalRef = useRef<HTMLDivElement>(null);
	const [isClosing, setIsClosing] = useState(false);

	const handleClose = useCallback(() => {
		setIsClosing(true);
		// 等待动画完成后再真正关闭
		setTimeout(() => {
			setIsClosing(false);
			onClose();
		}, 300);
	}, [onClose]);

	// ESC 键关闭模态框
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
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
	}, [isOpen, handleClose]);

	const handleBackdropClick = (e: React.MouseEvent) => {
		// 只有点击背景层时才关闭
		if (e.target === e.currentTarget) {
			handleClose();
		}
	};

	// 计算初始动画位置
	const getInitialPosition = () => {
		if (!originRect) {
			return {
				x: 0,
				y: 0,
				scale: 1,
				opacity: 0,
			};
		}

		// 获取视窗中心
		const viewportCenterX = window.innerWidth / 2;
		const viewportCenterY = window.innerHeight / 2;

		// 源矩形中心
		const originCenterX = originRect.left + originRect.width / 2;
		const originCenterY = originRect.top + originRect.height / 2;

		// 计算从源位置到视窗中心的偏移
		const translateX = originCenterX - viewportCenterX;
		const translateY = originCenterY - viewportCenterY;

		// 计算缩放比例 - 从源矩形大小缩放到模态框大小
		// 假设模态框是 50vw 宽度和 80vh 高度
		const targetWidth = window.innerWidth * 0.5;
		const targetHeight = window.innerHeight * 0.8;
		const scaleX = originRect.width / targetWidth;
		const scaleY = originRect.height / targetHeight;
		const scale = Math.min(scaleX, scaleY);

		return {
			x: translateX,
			y: translateY,
			scale: scale,
			opacity: 1,
		};
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
					onClick={handleBackdropClick}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							handleClose();
						}
					}}
					role="dialog"
					aria-modal="true"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.3 }}
				>
					{/* 关闭按钮 */}
					<motion.button
						type="button"
						onClick={handleClose}
						className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-[rgb(18,18,18)] text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-800 transition-colors shadow-lg"
						aria-label="关闭"
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.8 }}
						transition={{ duration: 0.2, delay: 0.1 }}
					>
						<X className="h-6 w-6" />
					</motion.button>

					<motion.div
						ref={modalRef}
						className="relative w-full max-w-[50vw] h-[80vh] flex flex-col"
						initial={getInitialPosition()}
						animate={{
							x: 0,
							y: 0,
							scale: 1,
							opacity: 1,
						}}
						exit={isClosing ? getInitialPosition() : undefined}
						transition={{
							type: "spring",
							damping: 25,
							stiffness: 200,
							duration: 0.3,
						}}
					>
						{/* 滚动内容区域 */}
						<div className="overflow-y-auto flex-1 h-full">
							<ArticleCard
								content={content}
								title={title}
								author={author}
								timestamp={timestamp}
								gallery={gallery}
								className="shadow-2xl min-h-full"
							/>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
