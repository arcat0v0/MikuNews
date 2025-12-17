import { motion } from "framer-motion";
import { Github, Heart, MessageCircleHeart } from "lucide-react";
import { ModalContainer } from "./ModalContainer";

export interface AboutModalProps {
	isOpen: boolean;
	onClose: () => void;
	originRect: DOMRect | null;
}

export const AboutModal = ({
	isOpen,
	onClose,
	originRect,
}: AboutModalProps) => {
	return (
		<ModalContainer isOpen={isOpen} onClose={onClose} originRect={originRect}>
			<div className="bg-white dark:bg-[rgb(18,18,18)] rounded-2xl shadow-2xl min-h-full p-12">
				{/* 头部 */}
				<div className="text-center mb-12">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
						className="inline-flex items-center justify-center w-20 h-20 mb-6"
					>
						<img src="/MikuNews.svg" alt="MikuNews Logo" className="w-20 h-20 rounded-2xl" />
					</motion.div>
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
					>
						关于 MikuNews
					</motion.h1>
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
					<p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
						MikuNews
						这里是初音的小世界，只提供一些与初音未来有关的演唱会、新歌、联动等信息，或者是一些初音未来的精美壁纸、图片。
					</p>
					<p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
						MikuNews是一个使用React Router
						v7打造的比较花哨的网页，使用了vite，外加使用Markdown来纂写文章内容。
					</p>
					<p className="text-gray-700 dark:text-gray-300 leading-relaxed">
						如果你有任何建议或想法，欢迎通过以下方式联系我们！
					</p>
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
							href="https://qm.qq.com/q/rj5UrwQsDu"
							className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors group"
						>
							<div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
								<MessageCircleHeart className="w-5 h-5 text-green-600 dark:text-green-400" />
							</div>
							<div>
								<div className="font-medium text-gray-900 dark:text-white">
									QQ 群：CYの聊天吹水群
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">
									314033009
								</div>
							</div>
						</a>
						<a
							href="https://github.com/arcat0v0/MikuNews"
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
									github.com/arcat0v0/MikuNews
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
						<Heart className="inline w-4 h-4 text-red-500" /> by the MikuNews
						Team
					</p>
				</motion.div>
			</div>
		</ModalContainer>
	);
};
