import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MediaItem } from "../utils/articleParser";

export interface MediaGalleryProps {
	media: MediaItem[];
	className?: string;
}

export const MediaGallery = ({ media, className = "" }: MediaGalleryProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);

	// 切换到下一个
	const goToNext = useCallback(() => {
		if (currentIndex < media.length - 1) {
			setCurrentIndex((prev) => prev + 1);
		}
	}, [currentIndex, media.length]);

	// 切换到上一个
	const goToPrev = useCallback(() => {
		if (currentIndex > 0) {
			setCurrentIndex((prev) => prev - 1);
		}
	}, [currentIndex]);

	// 跳转到指定索引
	const goToIndex = useCallback((index: number) => {
		setCurrentIndex(index);
	}, []);

	// 键盘导航
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") {
				goToPrev();
			} else if (e.key === "ArrowRight") {
				goToNext();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [goToPrev, goToNext]);

	// 触摸滑动支持
	const [touchStart, setTouchStart] = useState<number | null>(null);
	const [touchEnd, setTouchEnd] = useState<number | null>(null);

	const minSwipeDistance = 50;

	const onTouchStart = (e: React.TouchEvent) => {
		setTouchEnd(null);
		setTouchStart(e.targetTouches[0].clientX);
	};

	const onTouchMove = (e: React.TouchEvent) => {
		setTouchEnd(e.targetTouches[0].clientX);
	};

	const onTouchEnd = () => {
		if (!touchStart || !touchEnd) return;
		const distance = touchStart - touchEnd;
		const isLeftSwipe = distance > minSwipeDistance;
		const isRightSwipe = distance < -minSwipeDistance;
		if (isLeftSwipe) {
			goToNext();
		} else if (isRightSwipe) {
			goToPrev();
		}
	};

	if (!media || media.length === 0) return null;

	// 判断是否在边界
	const isAtStart = currentIndex === 0;
	const isAtEnd = currentIndex === media.length - 1;

	return (
		<div
			className={`relative w-full h-full rounded-xl overflow-hidden ${className}`}
			onTouchStart={onTouchStart}
			onTouchMove={onTouchMove}
			onTouchEnd={onTouchEnd}
		>
			{/* 媒体内容区域 */}
			<div className="relative w-full h-full overflow-hidden">
				<motion.div
					className="flex h-full"
					animate={{ x: `-${currentIndex * 100}%` }}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 30,
					}}
				>
					{media.map((item, index) => (
						<div
							key={`${item.src}-${index}`}
							className="w-full h-full flex-shrink-0 flex items-center justify-center"
						>
							{item.type === "image" ? (
								<img
									src={item.src}
									alt={item.alt || ""}
									className="max-h-full max-w-full object-contain"
								/>
							) : (
								<video
									src={item.src}
									poster={item.poster}
									controls
									className="max-h-full max-w-full object-contain"
								>
									<track kind="captions" />
								</video>
							)}
						</div>
					))}
				</motion.div>
			</div>

			{/* 左右切换按钮 */}
			{media.length > 1 && (
				<>
					<button
						type="button"
						onClick={goToPrev}
						disabled={isAtStart}
						className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black/50"
						aria-label="上一个"
					>
						<ChevronLeft className="w-6 h-6" />
					</button>
					<button
						type="button"
						onClick={goToNext}
						disabled={isAtEnd}
						className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-black/70"
						aria-label="下一个"
					>
						<ChevronRight className="w-6 h-6" />
					</button>
				</>
			)}

			{/* 底部指示器 */}
			{media.length > 1 && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
					{media.map((item, index) => (
						<button
							type="button"
							key={`${item.src}-${index}`}
							onClick={() => goToIndex(index)}
							className={`w-2 h-2 rounded-full transition-all ${
								index === currentIndex
									? "bg-white w-6"
									: "bg-white/50 hover:bg-white/75"
							}`}
							aria-label={`跳转到第 ${index + 1} 个`}
						/>
					))}
				</div>
			)}
		</div>
	);
};
