import { motion } from "framer-motion";
import { Mail, Github, Heart, Sparkles } from "lucide-react";
import { ModalContainer } from "./ModalContainer";

export interface AboutModalProps {
	isOpen: boolean;
	onClose: () => void;
	originRect: DOMRect | null;
}

export const AboutModal = ({ isOpen, onClose, originRect }: AboutModalProps) => {
	return (
		<ModalContainer isOpen={isOpen} onClose={onClose} originRect={originRect}>
			<div className="bg-white dark:bg-[rgb(18,18,18)] rounded-2xl shadow-2xl min-h-full p-12">
				{/* 头部 */}
				<div className="text-center mb-12">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
						className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-500 dark:to-blue-600"
					>
						<Sparkles className="w-10 h-10 text-white" />
					</motion.div>
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
					>
						关于 MikuNews
					</motion.h1>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className="text-lg text-gray-600 dark:text-gray-400"
					>
						一个现代化的资讯聚合平台
					</motion.p>
				</div>

				{/* 分隔线 */}
				<div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent mb-12" />

				{/* 关于我们 */}
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
					className="mb-12"
				>
					<h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
						<Heart className="w-6 h-6 text-red-500" />
						关于我们
					</h2>
					<p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
						MikuNews 致力于为用户提供最新、最全面的资讯内容。我们采用现代化的设计理念，
						结合智能布局算法，为您呈现独特的阅读体验。
					</p>
					<p className="text-gray-700 dark:text-gray-300 leading-relaxed">
						无论是科技动态、文化资讯还是精美图片，我们都精心筛选，
						只为给您带来最优质的内容。
					</p>
				</motion.section>

				{/* 特色功能 */}
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="mb-12"
				>
					<h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
						特色功能
					</h2>
					<div className="grid grid-cols-2 gap-4">
						{[
							{ title: "智能布局", desc: "自适应瀑布流布局" },
							{ title: "深色模式", desc: "护眼的夜间主题" },
							{ title: "实时搜索", desc: "快速找到感兴趣的内容" },
							{ title: "流畅动画", desc: "丝滑的交互体验" },
						].map((feature, index) => (
							<motion.div
								key={feature.title}
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: 0.7 + index * 0.1 }}
								className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800"
							>
								<h3 className="font-semibold text-gray-900 dark:text-white mb-1">
									{feature.title}
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{feature.desc}
								</p>
							</motion.div>
						))}
					</div>
				</motion.section>

				{/* 联系我们 */}
				<motion.section
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 1.1 }}
					className="mb-8"
				>
					<h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
						联系我们
					</h2>
					<div className="space-y-4">
						<a
							href="mailto:contact@mikunews.com"
							className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors group"
						>
							<div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center group-hover:bg-cyan-200 dark:group-hover:bg-cyan-900/50 transition-colors">
								<Mail className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
							</div>
							<div>
								<div className="font-medium text-gray-900 dark:text-white">
									邮箱
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">
									contact@mikunews.com
								</div>
							</div>
						</a>
						<a
							href="https://github.com/mikunews"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors group"
						>
							<div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
								<Github className="w-5 h-5 text-gray-700 dark:text-gray-300" />
							</div>
							<div>
								<div className="font-medium text-gray-900 dark:text-white">
									GitHub
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">
									github.com/mikunews
								</div>
							</div>
						</a>
					</div>
				</motion.section>

				{/* 底部 */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.3 }}
					className="text-center pt-8 border-t border-gray-200 dark:border-gray-800"
				>
					<p className="text-sm text-gray-500 dark:text-gray-500">
						© 2025 MikuNews. Made with{" "}
						<Heart className="inline w-4 h-4 text-red-500" /> by the
						MikuNews Team
					</p>
				</motion.div>
			</div>
		</ModalContainer>
	);
};
