import type { RectangleProps } from "../components/Rectangle";

export interface LayoutItem extends RectangleProps {
	isWebsiteInfo?: boolean; // 标识是否为网站信息卡片
	isEmpty?: boolean; // 标识是否为填充用的空卡片
	isWelcome?: boolean; // 标识是否为欢迎卡片
	isNavigation?: boolean; // 标识是否为导航卡片
}

/**
 * 根据重要程度获取占用的列数
 */
function getColSpan(importance: 0 | 1 | 2 | 3 | 4 = 4): number {
	const colSpanMap = {
		0: 4, // 整行
		1: 2, // 宽高各占一半
		2: 2, // 宽一半，高1/4
		3: 1, // 宽1/4，高一半
		4: 1, // 各占1/4
	};
	return colSpanMap[importance];
}

/**
 * 根据重要程度获取占用的行数
 */
function getRowSpan(importance: 0 | 1 | 2 | 3 | 4 = 4): number {
	const rowSpanMap = {
		0: 2, // 整行，高一半
		1: 2, // 宽高各占一半
		2: 1, // 宽一半，高1/4
		3: 2, // 宽1/4，高一半
		4: 1, // 各占1/4
	};
	return rowSpanMap[importance];
}

/**
 * 创建网站信息卡片
 * @param importance 重要级别
 * @returns 网站信息卡片对象
 */
function createWebsiteInfoCard(importance: 0 | 1 | 2 | 3 | 4): LayoutItem {
	return {
		importance,
		color: "#FFFFFF", // 默认白色，实际渲染时会根据暗黑模式调整
		title: "MikuNews",
		isWebsiteInfo: true,
	};
}

/**
 * 创建空填充卡片
 * @param importance 重要级别
 * @returns 空卡片对象
 */
function createEmptyCard(importance: 0 | 1 | 2 | 3 | 4): LayoutItem {
	return {
		importance,
		color: "#000000", // 黑色
		title: "",
		isEmpty: true,
	};
}

/**
 * 创建欢迎卡片
 * @returns 欢迎卡片对象
 */
function createWelcomeCard(): LayoutItem {
	return {
		importance: 2,
		color: "#FFFFFF",
		title: "",
		isWelcome: true,
	};
}

/**
 * 创建导航卡片
 * @returns 导航卡片对象
 */
function createNavigationCard(): LayoutItem {
	return {
		importance: 2,
		color: "#FFFFFF",
		title: "导航卡片",
		isNavigation: true,
	};
}

/**
 * 自动布局算法
 * 根据重要级别重新排序数组，确保每行横向占满4列
 * 自动在末尾添加网站信息卡片填充空隙，确保位于右下角
 *
 * @param rectangles 待布局的矩形数组
 * @returns 优化排序后的矩形数组（包含网站信息卡片）
 */
export function autoLayout(rectangles: RectangleProps[]): LayoutItem[] {
	// 空数组快速返回
	if (rectangles.length === 0) {
		return [];
	}

	const sortByTimestampDesc = (items: RectangleProps[]) =>
		[...items].sort((a, b) => {
			if (a.timestamp !== undefined && b.timestamp !== undefined) {
				return b.timestamp - a.timestamp; // 降序，最新的在前
			}
			if (a.timestamp !== undefined) return -1;
			if (b.timestamp !== undefined) return 1;
			return 0;
		});

	const promoteLatestImportance1 = (items: RectangleProps[]) => {
		const latestImportance1Index = items.findIndex(
			(item) => item.importance === 1,
		);
		if (latestImportance1Index > 0) {
			const [item] = items.splice(latestImportance1Index, 1);
			items.unshift(item);
		}
		return items;
	};

	// 1. 置顶文章优先，内部按时间排序
	const pinned = rectangles.filter((item) => item.isTop);
	const regular = rectangles.filter((item) => !item.isTop);

	const sortedPinned = promoteLatestImportance1(sortByTimestampDesc(pinned));
	const sortedRegular = promoteLatestImportance1(sortByTimestampDesc(regular));

	const sorted = [...sortedPinned, ...sortedRegular];

	// 3. 在第二个位置插入欢迎卡片
	const welcomeIndex = Math.max(1, sortedPinned.length);
	sorted.splice(welcomeIndex, 0, createWelcomeCard());

	// 4. 在第三个位置插入导航卡片
	const navigationIndex = Math.min(sorted.length, welcomeIndex + 1);
	sorted.splice(navigationIndex, 0, createNavigationCard());

	// 5. 根据布局规则重新排序（直接使用 sorted，避免复制）
	const result: LayoutItem[] = [];

	while (sorted.length > 0) {
		// 尝试构建完整的一行（4列）
		const rowItems = buildCompleteRow(sorted);

		if (rowItems.length > 0) {
			result.push(...rowItems);
		} else {
			// 如果无法构建完整行，将所有剩余元素添加进去
			result.push(...sorted);
			break;
		}
	}

	// 6. 模拟 Grid 布局，填充空卡片直到 InfoCard 能位于右下角
	fillHolesAndAddInfoCard(result);

	return result;
}

/**
 * 模拟 Grid 布局并填充空卡片
 */
function fillHolesAndAddInfoCard(items: LayoutItem[]) {
	const occupied = new Set<string>();
	let cursor = { r: 0, c: 0 };

	// 辅助函数：检查位置是否可用
	const checkFit = (r: number, c: number, w: number, h: number) => {
		if (c + w > 4) return false;
		for (let i = 0; i < h; i++) {
			for (let j = 0; j < w; j++) {
				if (occupied.has(`${r + i},${c + j}`)) return false;
			}
		}
		return true;
	};

	// 辅助函数：标记占用
	const markOccupied = (r: number, c: number, w: number, h: number) => {
		for (let i = 0; i < h; i++) {
			for (let j = 0; j < w; j++) {
				occupied.add(`${r + i},${c + j}`);
			}
		}
	};

	// 辅助函数：移动光标到下一个格子
	const advanceCursor = () => {
		cursor.c++;
		if (cursor.c >= 4) {
			cursor.c = 0;
			cursor.r++;
		}
	};

	// 模拟放置一个 item
	// 返回放置的位置 {r, c}
	const placeItem = (item: LayoutItem) => {
		const w = getColSpan(item.importance);
		const h = getRowSpan(item.importance);

		while (true) {
			// 检查当前光标位置是否可用
			if (checkFit(cursor.r, cursor.c, w, h)) {
				// 放置
				const pos = { ...cursor };
				markOccupied(pos.r, pos.c, w, h);
				// 光标不需要跳过整个 item，只需要在这个 item 之后继续寻找？
				// 不，Grid 算法在放置 item 后，光标会继续向前。
				// 这里我们简单地让光标前进一格，下次循环会检查占用情况。
				// 但是为了效率，我们可以直接让光标跳到 item 的右边？
				// 不建议，因为 item 可能是 2x2，右边 (r, c+2) 可能是空的，但下面 (r+1, c) 被占用了。
				// 最安全的模拟是逐格扫描。

				// 放置成功后，我们需要把光标移到这个 item 的"下一个"位置吗？
				// 标准 Grid 自动放置：光标更新为 item 之后的那个 slot。
				// 也就是 cursor.c += w。如果不换行的话。
				// 如果换行了，就得处理。
				// 简单处理：放置后，我们不强制移动光标，而是让下一次 `placeItem` 自己去找空位。
				// 但是 `placeItem` 是从当前的 `cursor` 开始找的。
				// 如果我们不更新 `cursor`，下一次 `placeItem` 可能会试图放在同一个位置（然后发现 checkFit 失败）。
				// 所以放置后，至少要 advanceCursor 一次？
				// 或者更准确地，cursor 应该移到 item 的右侧。
				// 例如 item 在 (0,0) 占 2x1。 cursor 应该变 (0,2)。
				// 如果 item 在 (0,2) 占 2x1。 cursor 应该变 (0,4) -> (1,0)。
				// 但是请注意，我们是模拟 sequential placement。
				// 所以放置后，更新 cursor 到 item 后面是合理的。

				// 更新 cursor
				// 注意：如果 item 跨多行，光标只在当前行移动？
				// MDN: "The auto-placement cursor is updated to the grid slot following the item's column span."
				let nextC = pos.c + w;
				let nextR = pos.r;
				if (nextC >= 4) {
					nextC = 0;
					nextR++;
				}
				cursor = { r: nextR, c: nextC };

				return pos;
			}
			advanceCursor();
		}
	};

	// 1. 模拟现有 items
	for (const item of items) {
		placeItem(item);
	}

	// 2. 尝试添加 InfoCard
	// 我们的目标是让 InfoCard 位于右下角
	// 优先使用 importance=2 (2x1) 的卡片，如果它能占据最后两列 (Col 2, 3)
	// 否则使用 importance=4 (1x1) 的卡片，如果它能占据最后一列 (Col 3)
	// 如果都不能满足，就填充一个 EmptyCard (1x1)，然后继续尝试

	const infoCard2 = createWebsiteInfoCard(2); // 2x1
	const infoCard4 = createWebsiteInfoCard(4); // 1x1

	// 辅助函数：尝试放置 item，不修改状态
	const tryPlaceItem = (item: LayoutItem): { r: number; c: number } | null => {
		const w = getColSpan(item.importance);
		const h = getRowSpan(item.importance);

		// 从当前 cursor 开始尝试
		// 为了不影响主逻辑的 cursor，我们需要一个临时的游标模拟寻找过程
		// 但是这会比较复杂，因为 checkFit 依赖 cursor。
		// 更好的方法是：保存当前 cursor，尝试 placeItem (它会修改 cursor 和 advance)，
		// 如果不满意，我们需要回滚状态？occupied 是 Set，比较难回滚。

		// 重新设计逻辑：
		// 我们的 checkFit 只是检查某点是否可用，并不修改 cursor。
		// 我们可以在不修改 occupied 的情况下，用 tempCursor 模拟 placeItem 的寻找过程。

		const tempCursor = { ...cursor };

		// 防止无限循环寻找
		let attempts = 0;
		while (attempts < 100) {
			// 找100次足够了，找不到就是真的满了或者需要换行很多次
			if (checkFit(tempCursor.r, tempCursor.c, w, h)) {
				return { ...tempCursor };
			}

			// advance tempCursor
			tempCursor.c++;
			if (tempCursor.c >= 4) {
				tempCursor.c = 0;
				tempCursor.r++;
			}
			attempts++;
		}
		return null;
	};

	// 如果没有需要填充的剩余空间（下一个可用位置已经在新行起始列），直接放置占满整行的信息卡片
	const nextAvailableSlot = tryPlaceItem(createEmptyCard(4));
	if (!nextAvailableSlot || nextAvailableSlot.c === 0) {
		const fullWidthInfoCard = createWebsiteInfoCard(0);
		placeItem(fullWidthInfoCard);
		items.push(fullWidthInfoCard);
		return;
	}

	let safetyCount = 0;
	while (safetyCount < 20) {
		// 1. 尝试放 InfoCard(2)
		// 如果放在了 col 2 (意味着占据 2,3)，则是完美的
		const pos2 = tryPlaceItem(infoCard2);
		if (pos2 && pos2.c === 2) {
			placeItem(infoCard2); // 真正放置
			items.push(infoCard2);
			break;
		}

		// 2. 尝试放 InfoCard(4)
		// 如果放在了 col 3 (意味着占据 3)，也是可以的
		const pos4 = tryPlaceItem(infoCard4);
		if (pos4 && pos4.c === 3) {
			placeItem(infoCard4); // 真正放置
			items.push(infoCard4);
			break;
		}

		// 3. 都不满足条件，填充 EmptyCard(4) 以推进光标
		const empty = createEmptyCard(4);
		placeItem(empty); // 真正放置，更新 cursor 和 occupied
		items.push(empty);

		safetyCount++;
	}
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
		let index = items.findIndex((item) => getColSpan(item.importance) === 2);
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
					(item, idx) => idx > index4 && item.importance === 4,
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
