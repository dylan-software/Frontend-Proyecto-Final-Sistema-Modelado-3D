import type { FurnitureInput } from "./api";
import type { CategoryGroup } from "../types/catalog";

/**
 * Splits the catalog into one group per category, keeping the order in which
 * each category first appears. O(n): a single pass, with a Map giving O(1)
 * lookup of the group an item belongs to.
 */
export function groupByCategory(items: readonly FurnitureInput[]): CategoryGroup[] {
  const groups = new Map<string, FurnitureInput[]>();
  for (const item of items) {
    const group = groups.get(item.category);
    if (group) group.push(item);
    else groups.set(item.category, [item]);
  }
  return Array.from(groups, ([category, groupItems]) => ({ category, items: groupItems }));
}
