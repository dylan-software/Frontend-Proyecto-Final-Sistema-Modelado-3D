import { es } from "../i18n/es";
import type { FurnitureInput } from "./api";
import type { CategoryGroup } from "../types/catalog";

/**
 * Texto que se muestra para una categoría: su etiqueta en español si existe y, si no (una categoría
 * escrita por el usuario), el valor original tal cual. No cambia el valor que se envía a la API.
 */
export function categoryLabel(category: string, labels: Readonly<Record<string, string>> = es.categories.groups): string {
  return Object.hasOwn(labels, category) ? labels[category]! : category;
}

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
