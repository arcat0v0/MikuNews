import type { MediaItem } from "@mikunews/models";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

type DisplayMediaItem = MediaItem & {
	collageItems?: MediaItem[];
};

export interface MediaGalleryProps {
	media: MediaItem[];
	className?: string;
	useNineGrid?: boolean;
}

export const MediaGallery = ({
	media,
	className = "",
	useNineGrid = false,
}: MediaGalleryProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [zoomedImage, setZoomedImage] = useState<{
		src: string;
		alt?: string;
	} | null>(null);

	const displayMedia = useMemo<DisplayMediaItem[]>(() => {
		if (useNineGrid) {
			// 用前九张图组成九宫格，其余素材按原顺序继续展示
			return [
				{
					type: "image",
					src: media[0]?.src ?? "",
					alt: media[0]?.alt ?? "",
					collageItems: media.slice(0, 9),
				},
				...media.slice(9),
			];
		}

		return media;
	}, [media, useNineGrid]);

	const clampedIndex = useMemo(
		() => Math.max(0, Math.min(currentIndex, displayMedia.length - 1)),
		[currentIndex, displayMedia.length],
	);

	// 切换到下一个
	const goToNext = useCallback(() => {
		setCurrentIndex((prev) => {
			const safeIndex = Math.max(0, Math.min(prev, displayMedia.length - 1));
			if (safeIndex < displayMedia.length - 1) {
				return safeIndex + 1;
			}
			return safeIndex;
		});
	}, [displayMedia.length]);

	// 切换到上一个
	const goToPrev = useCallback(() => {
		setCurrentIndex((prev) => {
			const safeIndex = Math.max(0, Math.min(prev, displayMedia.length - 1));
			if (safeIndex > 0) {
				return safeIndex - 1;
			}
			return safeIndex;
		});
	}, [displayMedia.length]);

	// 跳转到指定索引
	const goToIndex = useCallback(
		(index: number) => {
			setCurrentIndex(Math.max(0, Math.min(index, displayMedia.length - 1)));
		},
		[displayMedia.length],
	);

	const openZoom = useCallback((src: string, alt?: string) => {
		setZoomedImage({ src, alt });
	}, []);

	const closeZoom = useCallback(() => {
		setZoomedImage(null);
	}, []);

	// 键盘导航
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && zoomedImage) {
				e.preventDefault();
				if (typeof e.stopPropagation === "function") {
					e.stopPropagation();
				}
				if (typeof e.stopImmediatePropagation === "function") {
					e.stopImmediatePropagation();
				}
				closeZoom();
				return;
			}

			if (zoomedImage) {
				if (typeof e.stopPropagation === "function") {
					e.stopPropagation();
				}
				return;
			}

			if (e.key === "ArrowLeft") {
				goToPrev();
			} else if (e.key === "ArrowRight") {
				goToNext();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [goToPrev, goToNext, zoomedImage, closeZoom]);

	// 捕获阶段阻断 ESC 传播，防止父级模态被关闭
	useEffect(() => {
		if (!zoomedImage) return;

		const handleCaptureKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				closeZoom();
			}
		};

		document.addEventListener("keydown", handleCaptureKeyDown, true);
		return () => {
			document.removeEventListener("keydown", handleCaptureKeyDown, true);
		};
	}, [zoomedImage, closeZoom]);

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
		if (touchStart === null || touchEnd === null) return;
		const distance = touchStart - touchEnd;
		const isLeftSwipe = distance > minSwipeDistance;
		const isRightSwipe = distance < -minSwipeDistance;
		if (isLeftSwipe) {
			goToNext();
		} else if (isRightSwipe) {
			goToPrev();
		}
	};

	if (!displayMedia || displayMedia.length === 0) return null;

	// 判断是否在边界
	const isAtStart = clampedIndex === 0;
	const isAtEnd = clampedIndex === displayMedia.length - 1;
	const isShowingCollage = Boolean(
		displayMedia[clampedIndex]?.collageItems?.length,
	);

	return (
		<div
			className={`w-full rounded-xl overflow-hidden h-full`}
			onTouchStart={onTouchStart}
			onTouchMove={onTouchMove}
			onTouchEnd={onTouchEnd}
		>
			{/* 媒体内容区域 */}
			<div className={`relative w-full overflow-hidden h-full`}>
				<motion.div
					className={`flex items-center h-full`}
					animate={{ x: `-${clampedIndex * 100}%` }}
					transition={{
						type: "spring",
						stiffness: 300,
						damping: 30,
					}}
				>
					{displayMedia.map((item, index) => (
						<div
							key={`${item.src}-${index}`}
							className={`w-full shrink-0 flex justify-center items-center h-full`}
						>
							{item.type === "image" ? (
								item.collageItems ? (
									<div className="grid aspect-square w-full max-w-full grid-cols-3 grid-rows-3 gap-1">
										{item.collageItems.map((subItem, subIndex) => (
											<button
												type="button"
												key={`${subItem.src}-${subIndex}`}
												onClick={() => openZoom(subItem.src, subItem.alt)}
												className="relative h-full w-full overflow-hidden cursor-zoom-in"
											>
												<img
													src={subItem.src}
													alt={subItem.alt || ""}
													className="h-full w-full object-cover"
												/>
											</button>
										))}
									</div>
								) : (
									<button
										type="button"
										className="w-full h-full flex items-center justify-center"
										onClick={() => openZoom(item.src, item.alt)}
										onKeyDown={(e) => {
											if (e.key === " " || e.key === "Enter") {
												e.preventDefault();
												openZoom(item.src, item.alt);
											}
										}}
									>
										<img
											src={item.src}
											alt={item.alt || ""}
											className="max-h-full max-w-full object-contain cursor-zoom-in"
										/>
									</button>
								)
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
			{displayMedia.length > 1 && (
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
			{displayMedia.length > 1 && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
					{displayMedia.map((item, index) => (
						<button
							type="button"
							key={`${item.src}-${index}`}
							onClick={() => goToIndex(index)}
							className={`w-2 h-2 rounded-full transition-all ${
								index === clampedIndex
									? "bg-white w-6"
									: "bg-white/50 hover:bg-white/75"
							}`}
							aria-label={`跳转到第 ${index + 1} 个`}
						/>
					))}
				</div>
			)}

			{zoomedImage && (
				<div
					className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
					onClick={closeZoom}
					role="dialog"
					aria-label="查看大图"
					onKeyDown={(e) => {
						e.stopPropagation();
						if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							closeZoom();
						}
					}}
				>
					<button
						type="button"
						onClick={closeZoom}
						className="absolute top-4 right-4 text-white bg-black/60 hover:bg-black/80 rounded-full p-2"
						aria-label="关闭大图"
					>
						<span className="text-lg font-semibold leading-none">X</span>
					</button>
					<img
						src={zoomedImage.src}
						alt={zoomedImage.alt || ""}
						className="max-h-full max-w-full object-contain shadow-2xl cursor-zoom-out"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							e.stopPropagation();
							if (e.key === " " || e.key === "Enter") {
								e.preventDefault();
							}
						}}
					/>
				</div>
			)}
		</div>
	);
};
