import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface ModalContainerProps {
	isOpen: boolean;
	onClose: () => void;
	originRect: DOMRect | null;
	children: ReactNode;
	/** 模态框宽度，默认 "50vw" */
	width?: string;
	/** 模态框高度，默认 "80vh" */
	height?: string;
	/** 自定义内容容器的 className */
	contentClassName?: string;
}

export const ModalContainer = ({
	isOpen,
	onClose,
	originRect,
	children,
	width = "50vw",
	height = "80vh",
}: ModalContainerProps) => {
	const [isClosing, setIsClosing] = useState(false);

	const handleClose = useCallback(() => {
		setIsClosing(true);
		setTimeout(() => {
			setIsClosing(false);
			onClose();
		}, 300);
	}, [onClose]);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
			document.documentElement.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "";
			document.documentElement.style.overflow = "";
		};
	}, [isOpen, handleClose]);

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	};

	const getInitialPosition = useCallback(() => {
		if (!originRect) {
			return {
				x: 0,
				y: 0,
				scale: 1,
				opacity: 0,
			};
		}

		const viewportCenterX = window.innerWidth / 2;
		const viewportCenterY = window.innerHeight / 2;

		const originCenterX = originRect.left + originRect.width / 2;
		const originCenterY = originRect.top + originRect.height / 2;

		const translateX = originCenterX - viewportCenterX;
		const translateY = originCenterY - viewportCenterY;

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
	}, [originRect]);

	return createPortal(
		<AnimatePresence>
			{isOpen && (
				<motion.div
					className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-hidden"
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
						className="relative flex flex-col"
						style={{ width, height, maxWidth: width, maxHeight: height }}
						onClick={(e) => e.stopPropagation()}
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
						<div className="overflow-y-auto flex-1 h-full overscroll-contain">
							{children}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	);
};
