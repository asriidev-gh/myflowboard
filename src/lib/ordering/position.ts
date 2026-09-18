const STEP = 1024;

function parsePosition(value?: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** First position when a list/card collection is empty. */
export function initialPosition(): string {
  return String(STEP);
}

/** Append after the current last item. */
export function positionAfter(last?: string | null): string {
  const n = parsePosition(last);
  if (n === null) return initialPosition();
  return String(n + STEP);
}

/**
 * Insert between two neighbors without rewriting the board.
 * Falls back to append when the integer gap is exhausted.
 */
export function positionBetween(
  before?: string | null,
  after?: string | null,
): string {
  const result = tryPositionBetween(before, after);
  if (result) return result;
  const a = parsePosition(before);
  if (a !== null) return String(a + STEP);
  return initialPosition();
}

export function tryPositionBetween(
  before?: string | null,
  after?: string | null,
): string | null {
  const a = parsePosition(before);
  const b = parsePosition(after);

  if (a === null && b === null) return initialPosition();
  if (a === null && b !== null) {
    const mid = Math.floor(b / 2);
    return mid > 0 ? String(mid) : null;
  }
  if (a !== null && b === null) return String(a + STEP);
  if (a !== null && b !== null) {
    if (b - a > 1) {
      return String(Math.floor((a + b) / 2));
    }
    return null;
  }
  return initialPosition();
}

/** Rewrite positions with even spacing (used when gaps collapse). */
export function rebalancePositions<T extends { id: string }>(
  items: T[],
): { id: string; position: string }[] {
  return items.map((item, index) => ({
    id: item.id,
    position: String((index + 1) * STEP),
  }));
}

export function sortByPosition<T extends { position: string }>(items: T[]): T[] {
  return [...items].sort((x, y) => {
    const ax = parsePosition(x.position) ?? 0;
    const ay = parsePosition(y.position) ?? 0;
    if (ax !== ay) return ax - ay;
    return x.position.localeCompare(y.position);
  });
}

/**
 * Compute insert position from neighbors. Rebalances the ordered set when
 * midpoints are no longer available.
 */
export function resolveInsertPosition(args: {
  orderedIds: string[];
  positions: Record<string, string>;
  itemId: string;
  beforeId: string | null;
  afterId: string | null;
}):
  | { kind: "single"; position: string }
  | { kind: "rebalance"; positions: { id: string; position: string }[] } {
  const beforePos = args.beforeId ? args.positions[args.beforeId] : null;
  const afterPos = args.afterId ? args.positions[args.afterId] : null;
  const between = tryPositionBetween(beforePos, afterPos);

  if (between) {
    return { kind: "single", position: between };
  }

  const without = args.orderedIds.filter((id) => id !== args.itemId);
  let insertAt = without.length;
  if (args.beforeId) {
    const idx = without.indexOf(args.beforeId);
    insertAt = idx === -1 ? without.length : idx + 1;
  } else if (args.afterId) {
    const idx = without.indexOf(args.afterId);
    insertAt = idx === -1 ? 0 : idx;
  }

  const nextOrder = [...without];
  nextOrder.splice(Math.max(0, insertAt), 0, args.itemId);

  return {
    kind: "rebalance",
    positions: rebalancePositions(nextOrder.map((id) => ({ id }))),
  };
}
