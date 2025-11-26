import type { RectangleProps } from "../components/Rectangle";

interface GridCell {
	occupied: boolean;
}

/**
 * 自动布局算法
 * @param rectangles 待布局的矩形数组
 * @param gridCols 网格列数（默认4）
 * @param gridRows 网格行数（默认4）
 * @returns 排序并添加了位置信息的矩形数组
 */
export function autoLayout(
	rectangles: RectangleProps[],
	gridCols: number = 4,
	gridRows: number = 4,
): RectangleProps[] {
	// 1. 按时间戳排序作为基础优先级
	const sortedRectangles = [...rectangles].sort((a, b) => {
		if (a.timestamp !== undefined && b.timestamp !== undefined) {
			return b.timestamp - a.timestamp; // 降序，最新的在前
		}
		if (a.timestamp !== undefined) return -1;
		if (b.timestamp !== undefined) return 1;
		return 0;
	});

	// 2. 创建网格占用表
	const grid: GridCell[][] = Array.from({ length: gridRows }, () =>
		Array.from({ length: gridCols }, () => ({ occupied: false })),
	);

	const placedRectangles: RectangleProps[] = [];
	const placedIndices = new Set<number>();

	// 3. 网格遍历填充策略
	// 遍历每一个网格单元，寻找最适合该位置的矩形
	// 这种方法可以最大程度减少中间的空洞，将空白挤压到最后
	for (let row = 0; row < gridRows; row++) {
		for (let col = 0; col < gridCols; col++) {
			// 如果当前格子已被占用，跳过
			if (grid[row][col].occupied) continue;

			// 在剩余的矩形中寻找最适合放在当前位置(row, col)的矩形
			let bestCandidateIndex = -1;
			let maxScore = -Number.MAX_VALUE;

			for (let i = 0; i < sortedRectangles.length; i++) {
				if (placedIndices.has(i)) continue;

				const rect = sortedRectangles[i];

				// 检查边界
				if (row + rect.rowSpan > gridRows || col + rect.colSpan > gridCols)
					continue;

				// 检查是否与已有矩形重叠
				if (!canPlace(grid, row, col, rect.rowSpan, rect.colSpan)) continue;

				// 评分标准：
				// 1. 优先选择面积大的矩形（减少碎片化）
				// 2. 面积相同时，优先选择原始排序靠前的（时间戳新的）
				const area = rect.rowSpan * rect.colSpan;
				// 面积权重设为1000，确保面积优先。减去索引 i 确保同面积下索引小的优先
				const score = area * 1000 - i;

				if (score > maxScore) {
					maxScore = score;
					bestCandidateIndex = i;
				}
			}

			// 如果找到了合适的矩形，放置它
			if (bestCandidateIndex !== -1) {
				const rect = sortedRectangles[bestCandidateIndex];
				markOccupied(grid, row, col, rect.rowSpan, rect.colSpan, true);
				placedRectangles.push(rect);
				placedIndices.add(bestCandidateIndex);
			}
		}
	}

	return placedRectangles;
}

/**
 * 检查指定位置是否可以放置矩形
 */
function canPlace(
	grid: GridCell[][],
	startRow: number,
	startCol: number,
	rowSpan: number,
	colSpan: number,
): boolean {
	for (let r = startRow; r < startRow + rowSpan; r++) {
		for (let c = startCol; c < startCol + colSpan; c++) {
			if (grid[r][c].occupied) {
				return false;
			}
		}
	}
	return true;
}

/**
 * 标记网格区域为已占用或未占用
 */
function markOccupied(
	grid: GridCell[][],
	startRow: number,
	startCol: number,
	rowSpan: number,
	colSpan: number,
	occupied: boolean,
): void {
	for (let r = startRow; r < startRow + rowSpan; r++) {
		for (let c = startCol; c < startCol + colSpan; c++) {
			grid[r][c].occupied = occupied;
		}
	}
}

/**
 * 计算已占用区域的"重心"位置
 * 用于评估布局的紧凑度（重心越靠左上越好）
 */
function calculateCenterOfMass(grid: GridCell[][]): {
	row: number;
	col: number;
} {
	let totalRow = 0;
	let totalCol = 0;
	let count = 0;

	for (let r = 0; r < grid.length; r++) {
		for (let c = 0; c < grid[r].length; c++) {
			if (grid[r][c].occupied) {
				totalRow += r;
				totalCol += c;
				count++;
			}
		}
	}

	return {
		row: count > 0 ? totalRow / count : 0,
		col: count > 0 ? totalCol / count : 0,
	};
}
