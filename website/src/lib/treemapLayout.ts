// Pure slice-and-dice treemap layout, generic over the tile payload.
// Returns rectangles in percentage coordinates (0-100). Shared by
// EntitiesTreemap and SecretariatTreemap so the layout math lives in one place.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreemapItem<T> {
  value: number;
  data: T;
}

export const GAP = 0.15;

export function squarify<T>(
  items: TreemapItem<T>[],
  x: number,
  y: number,
  width: number,
  height: number
): (Rect & { data: T })[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0 || items.length === 0) return [];

  const normalized = items.map((item) => ({
    ...item,
    normalizedValue: (item.value / total) * width * height,
  }));

  return slice(normalized, x, y, width, height);
}

export interface GroupRect extends Rect {
  key: string;
}

/**
 * Two-tier grouped-treemap banding. Given groups in render order (each with a
 * positive `total`), returns one rectangle per group:
 * - groups whose full-width row would be >= `minHeightPct` of the height are
 *   stacked top-to-bottom as full-width rows;
 * - the last such "regular" group plus every group too small for its own row
 *   are packed together into a nested squarified block at the bottom, so small
 *   groups become compact corner boxes instead of unreadable thin strips.
 * Callers squarify each group's entities inside the returned rectangle.
 */
export function layoutGroups(
  groups: { key: string; total: number }[],
  width = 100,
  height = 100,
  gap = GAP,
  minHeightPct = 5
): GroupRect[] {
  const totalBudget = groups.reduce((sum, g) => sum + g.total, 0);
  if (totalBudget <= 0) return [];

  const regular: typeof groups = [];
  const small: typeof groups = [];
  for (const g of groups) {
    const rowHeight = (g.total / totalBudget) * height;
    (rowHeight < minHeightPct ? small : regular).push(g);
  }

  const result: GroupRect[] = [];
  let currentY = 0;

  // Full-width rows for all but the last regular group.
  for (const g of regular.slice(0, -1)) {
    const rowHeight = (g.total / totalBudget) * height - gap;
    result.push({ key: g.key, x: 0, y: currentY, width, height: rowHeight });
    currentY += rowHeight + gap;
  }

  // Bottom band: last regular group + all small groups, packed as a nested
  // treemap so the small ones land in a corner with readable aspect ratios.
  const bandGroups = [...regular.slice(-1), ...small];
  if (bandGroups.length > 0) {
    const bandTotal = bandGroups.reduce((sum, g) => sum + g.total, 0);
    const bandHeight = (bandTotal / totalBudget) * height - gap;
    const rects = squarify(
      bandGroups.map((g) => ({ value: g.total, data: g.key })),
      0,
      currentY,
      width,
      bandHeight
    );
    for (const r of rects) {
      result.push({ key: r.data, x: r.x, y: r.y, width: r.width, height: r.height });
    }
  }

  return result;
}

function slice<T>(
  items: (TreemapItem<T> & { normalizedValue: number })[],
  x: number,
  y: number,
  width: number,
  height: number
): (Rect & { data: T })[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, width, height, data: items[0].data }];
  }

  const total = items.reduce((sum, item) => sum + item.normalizedValue, 0);

  let sum = 0;
  let splitIndex = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].normalizedValue;
    if (sum >= total / 2) {
      splitIndex = i + 1;
      break;
    }
  }
  splitIndex = Math.max(1, Math.min(splitIndex, items.length - 1));

  const leftItems = items.slice(0, splitIndex);
  const rightItems = items.slice(splitIndex);

  const leftSum = leftItems.reduce(
    (sum, item) => sum + item.normalizedValue,
    0
  );

  if (width >= height) {
    const leftWidth = width * (leftSum / total) - GAP / 2;
    return [
      ...slice(leftItems, x, y, leftWidth, height),
      ...slice(
        rightItems,
        x + leftWidth + GAP,
        y,
        width - leftWidth - GAP,
        height
      ),
    ];
  } else {
    const leftHeight = height * (leftSum / total) - GAP / 2;
    return [
      ...slice(leftItems, x, y, width, leftHeight),
      ...slice(
        rightItems,
        x,
        y + leftHeight + GAP,
        width,
        height - leftHeight - GAP
      ),
    ];
  }
}
