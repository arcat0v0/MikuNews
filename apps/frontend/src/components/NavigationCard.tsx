import { useState, useEffect, useRef, memo } from "react";
import { useLocation, useNavigate } from "react-router";
import { useThemeStore } from "../store/themeStore";
import { useArticleLayoutStore } from "../store/articleLayoutStore";
import { Input } from "./ui/input";
import { AboutModal } from "./AboutModal";

type NavigationButton = {
	label: string;
	href: string;
};

const NAVIGATION_BUTTONS: NavigationButton[] = [
	{ label: "资讯", href: "/news" },
	{ label: "美图", href: "/gallery" },
	{ label: "关于", href: "/about" },
];

const buttonClassName =
	"px-5 py-2 rounded-full dark:border-gray-700/80 text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer";

interface NavigationButtonItemProps {
	button: NavigationButton;
	onAboutClick?: (rect: DOMRect) => void;
	aboutButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

const NavigationButtonItem = memo(
	({ button, onAboutClick, aboutButtonRef }: NavigationButtonItemProps) => {
		const isAboutButton = button.label === "关于";

		if (isAboutButton && onAboutClick) {
			return (
				<button
					type="button"
					ref={aboutButtonRef}
					onClick={(e) => {
						e.preventDefault();
						const rect = aboutButtonRef?.current?.getBoundingClientRect();
						if (rect) onAboutClick(rect);
					}}
					className={buttonClassName}
				>
					{button.label}
				</button>
			);
		}

		return (
			<a href={button.href} className={buttonClassName}>
				{button.label}
			</a>
		);
	},
);

export interface NavigationCardProps {
	importance?: 0 | 1 | 2 | 3 | 4; // 重要程度：0=整行宽高一半, 1=宽高各占一半, 2=宽一半高1/4, 3=宽1/4高一半, 4=各占1/4
	buttons?: NavigationButton[];
}

const getSpanFromImportance = (imp: 0 | 1 | 2 | 3 | 4) => {
	const spanMap = {
		0: { colSpan: 4, rowSpan: 2 }, // 整行，高一半
		1: { colSpan: 2, rowSpan: 2 }, // 宽高各占一半
		2: { colSpan: 2, rowSpan: 1 }, // 宽一半，高1/4
		3: { colSpan: 1, rowSpan: 2 }, // 宽1/4，高一半
		4: { colSpan: 1, rowSpan: 1 }, // 各占1/4
	};
	return spanMap[imp];
};

const NavigationCardComponent = ({
	importance = 2,
	buttons,
}: NavigationCardProps) => {
	const location = useLocation();
	const navigate = useNavigate();
	const isDarkMode = useThemeStore((state) => state.isDarkMode);
	const searchTerm = useArticleLayoutStore((state) => state.searchTerm);
	const setSearchTerm = useArticleLayoutStore((state) => state.setSearchTerm);
	const layoutRectangles = useArticleLayoutStore(
		(state) => state.layoutRectangles,
	);
	const { colSpan, rowSpan } = getSpanFromImportance(importance);

	const [inputValue, setInputValue] = useState(searchTerm);
	const [isFocused, setIsFocused] = useState(false);
	const [aboutButtonRect, setAboutButtonRect] = useState<DOMRect | null>(null);
	const aboutButtonRef = useRef<HTMLButtonElement>(null);
	const debounceTimerRef = useRef<number | null>(null);
	const navigationButtons = buttons ?? NAVIGATION_BUTTONS;

	const isSearching = inputValue !== searchTerm;

	// 优化后的防抖逻辑：使用单个 setTimeout
	useEffect(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			setSearchTerm(inputValue);
		}, 500);

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [inputValue, setSearchTerm]);

	// 根据路由状态派生模态框状态
	const shouldShowModal = location.pathname === "/about";

	const openAboutCard = (rect: DOMRect | null) => {
		setAboutButtonRect(rect);
		if (location.pathname !== "/about") {
			navigate("/about", { replace: true });
		}
	};

	const closeAboutCard = () => {
		setAboutButtonRect(null);
		if (location.pathname === "/about") {
			navigate("/", { replace: true });
		}
	};

	return (
		<div
			className="relative overflow-hidden bg-white dark:bg-black "
			style={{
				gridColumn: `span ${colSpan}`,
				gridRow: `span ${rowSpan}`,
				height:
					importance === 0 || importance === 1 || importance === 3
						? "50vh"
						: "25vh",
			}}
			data-dark-mode={isDarkMode ? "true" : "false"}
		>
			<div className="relative z-10 grid h-full w-full grid-rows-[auto_auto_1fr] gap-6 px-8 py-8">
				<div className="relative mx-auto w-full max-w-xl">
					<div className="relative">
						<Input
							type="search"
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onFocus={() => setIsFocused(true)}
							onBlur={() => setIsFocused(false)}
							aria-label="搜索文章"
							className={`h-auto rounded-none border-0 bg-transparent px-0 py-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 ${
								isFocused ? "text-xl border-b-2" : "text-2xl border-b-0"
							} ${
								searchTerm && layoutRectangles.length === 0
									? "border-red-500 focus-visible:border-red-600 dark:border-red-500 dark:focus-visible:border-red-400"
									: "border-gray-400/70 focus-visible:border-gray-900 dark:border-white/60 dark:focus-visible:border-white"
							}`}
						/>
						{!inputValue && (
							<span
								style={{ fontFamily: "DeYiHei" }}
								className={`absolute left-0 pointer-events-none text-gray-400 dark:text-gray-500 transition-all duration-300 ${
									isFocused
										? "text-xl top-3 scale-75 -translate-y-2 origin-left"
										: "text-2xl top-3 scale-100"
								}`}
							>
								搜索文章标题或内容
							</span>
						)}
					</div>
					{isSearching && (
						<div className="absolute right-0 top-1/2 -translate-y-1/2">
							<div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full" />
						</div>
					)}
				</div>

				<div className="h-px w-full bg-gray-300 dark:bg-white/20" />

				<div className="flex items-start justify-center gap-4">
					{navigationButtons.map((btn) => (
						<NavigationButtonItem
							key={`${btn.label}-${btn.href}`}
							button={btn}
							onAboutClick={(rect) => {
								openAboutCard(rect);
							}}
							aboutButtonRef={aboutButtonRef}
						/>
					))}
				</div>

				<AboutModal
					isOpen={shouldShowModal}
					onClose={closeAboutCard}
					originRect={aboutButtonRect}
				/>
			</div>
		</div>
	);
};

// 使用 memo 优化组件
export const NavigationCard = memo(NavigationCardComponent);
