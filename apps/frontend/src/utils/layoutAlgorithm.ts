import type { RectangleProps } from "../components/Rectangle";

/**
 * 根据重要程度获取占用的列数
 */
function getColSpan(importance: 1 | 2 | 3 | 4 = 4): number {
	const colSpanMap = {
		1: 2, // 宽高各占一半
		2: 2, // 宽一半，高1/4
		3: 1, // 宽1/4，高一半
		4: 1, // 各占1/4
	};
	return colSpanMap[importance];
}

/**
 * 自动布局算法
 * 根据重要级别重新排序数组，确保每行横向占满4列
 *
 * 布局规则（4列网格）：
 * - importance=1 (2x2): 占2列，后面需要再2列 -> 可跟 1/2/33/44
 * - importance=2 (2x1): 占2列，后面需要再2列 -> 可跟 1/2/33/44
 * - importance=3 (1x2): 占1列，后面需要再3列 -> 可跟 3(+需要2列)/44(+需要1列)
 * - importance=4 (1x1): 占1列，后面需要再3列 -> 可跟 4(+需要2列)
 *
 * @param rectangles 待布局的矩形数组
 * @returns 优化排序后的矩形数组
 */
export function autoLayout(rectangles: RectangleProps[]): RectangleProps[] {
	// 1. 按时间戳排序作为基础优先级
	const sorted = [...rectangles].sort((a, b) => {
		if (a.timestamp !== undefined && b.timestamp !== undefined) {
			return b.timestamp - a.timestamp; // 降序，最新的在前
		}
		if (a.timestamp !== undefined) return -1;
		if (b.timestamp !== undefined) return 1;
		return 0;
	});

	// 2. 根据布局规则重新排序
	const result: RectangleProps[] = [];
	const remaining = [...sorted];

	while (remaining.length > 0) {
		// 尝试构建完整的一行（4列）
		const rowItems = buildCompleteRow(remaining);

		if (rowItems.length > 0) {
			result.push(...rowItems);
		} else {
			// 如果无法构建完整行，直接取剩余元素（避免死循环）
			result.push(...remaining);
			break;
		}
	}

	return result;
}

/**
 * 从剩余元素中构建一个完整的行（4列）
 * @param remaining 剩余元素数组（会被修改）
 * @returns 构成一行的元素数组
 */
function buildCompleteRow(remaining: RectangleProps[]): RectangleProps[] {
	if (remaining.length === 0) return [];

	const row: RectangleProps[] = [];
	let colsUsed = 0;

	// 取第一个元素
	const first = remaining.shift()!;
	row.push(first);
	colsUsed += getColSpan(first.importance);

	// 根据已占用列数，继续填充直到满4列
	while (colsUsed < 4 && remaining.length > 0) {
		const needed = 4 - colsUsed;
		const nextIndex = findBestMatch(remaining, needed, row[row.length - 1]);

		if (nextIndex === -1) {
			// 找不到合适的元素
			// 优化：如果第一个元素不是importance=1，检查后面是否有importance=1
			// 如果有，把1移到前面，可以更好地填充空间
			if (first.importance !== 1) {
				const index1 = remaining.findIndex((item) => item.importance === 1);
				if (index1 !== -1) {
					// 把row的所有元素放回去
					remaining.unshift(...row);
					// 把找到的1移到最前面
					const item1 = remaining.splice(index1 + row.length, 1)[0];
					remaining.unshift(item1);
					// 递归重新构建这一行
					return buildCompleteRow(remaining);
				}
			}

			// 找不到合适的元素，回退所有元素
			remaining.unshift(...row);
			return [];
		}

		const next = remaining.splice(nextIndex, 1)[0];
		row.push(next);
		colsUsed += getColSpan(next.importance);
	}

	// 检查是否正好填满4列
	if (colsUsed === 4) {
		return row;
	} else {
		// 如果没有填满，回退所有元素
		remaining.unshift(...row);
		return [];
	}
}

/**
 * 根据需要的列数和上一个元素，找到最合适的元素索引
 * @param items 剩余的元素数组
 * @param neededCols 还需要多少列才能填满4列
 * @param prevItem 上一个放置的元素
 * @returns 找到的元素索引，-1表示未找到
 */
function findBestMatch(
	items: RectangleProps[],
	neededCols: number,
	prevItem: RectangleProps,
): number {
	const prevImportance = prevItem.importance || 4;

	// 情况1: 需要2列（前面已经放了占2列的元素，如 importance=1 或 2）
	if (neededCols === 2) {
		// 可以放：1、2、3、4
		// 优先级：先找1或2（正好占2列），然后找3，最后找4

		// 优先找占2列的
		let index = items.findIndex(
			(item) => getColSpan(item.importance) === 2
		);
		if (index !== -1) return index;

		// 其次找3（占1列，后续还需要1列）
		index = items.findIndex((item) => item.importance === 3);
		if (index !== -1) return index;

		// 最后找4
		index = items.findIndex((item) => item.importance === 4);
		return index;
	}

	// 情况2: 需要1列（前面已经放了3列）
	if (neededCols === 1) {
		// 根据前一个元素的规则：
		// - 如果前一个是3，这一个只能是3
		// - 如果前一个是4，这一个只能是4

		if (prevImportance === 3) {
			return items.findIndex((item) => item.importance === 3);
		}
		if (prevImportance === 4) {
			return items.findIndex((item) => item.importance === 4);
		}

		// 否则找任何占1列的
		return items.findIndex((item) => getColSpan(item.importance) === 1);
	}

	// 情况3: 需要3列（前面已经放了占1列的元素，如 importance=3 或 4）
	if (neededCols === 3) {
		// 根据规则：
		// - 如果前一个是3，后面必须跟3，或者跟44
		// - 如果前一个是4，后面必须跟4

		if (prevImportance === 3) {
			// 优先找另一个3
			const index3 = items.findIndex((item) => item.importance === 3);
			if (index3 !== -1) return index3;

			// 或者找两个4
			const index4 = items.findIndex((item) => item.importance === 4);
			if (index4 !== -1) {
				// 检查后面是否还有第二个4
				const secondIndex4 = items.findIndex(
					(item, idx) => idx > index4 && item.importance === 4
				);
				if (secondIndex4 !== -1) {
					return index4; // 返回第一个4
				}
			}
		}

		if (prevImportance === 4) {
			// 必须找另一个4
			return items.findIndex((item) => item.importance === 4);
		}

		// 否则找任何占1列的
		return items.findIndex((item) => getColSpan(item.importance) === 1);
	}

	return -1;
}
