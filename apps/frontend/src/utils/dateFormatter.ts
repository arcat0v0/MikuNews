/**
 * 格式化时间戳为本地时间
 * @param timestamp - Unix 时间戳（毫秒）
 * @param options - 可选的格式化选项
 * @returns 格式化后的时间字符串
 */
export function formatTimestamp(
	timestamp?: number,
	options?: {
		dateStyle?: "full" | "long" | "medium" | "short";
		timeStyle?: "full" | "long" | "medium" | "short";
		locale?: string;
	},
): string {
	if (!timestamp) return "";

	const {
		dateStyle = "medium",
		timeStyle = "short",
		locale = undefined,
	} = options || {};

	return new Date(timestamp).toLocaleString(locale, {
		dateStyle,
		timeStyle,
	});
}
