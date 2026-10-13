import { useMemo } from "react";

import type { FurnitureInput } from "../lib/api";
import { isCustomCategory } from "./ObjectForm";

interface CategoryAccordionProps {
  items: FurnitureInput[];
}

interface CategoryGroup {
  category: string;
  items: FurnitureInput[];
}

/** Display names of the predefined categories; custom ones are shown as typed. */
const CATEGORY_LABELS: Record<string, string> = {
  bed: "Camas",
  chair: "Sillas",
  table: "Mesas",
  sofa: "Sofás",
  shelf: "Estanterías",
  lamp: "Lámparas",
  other: "Otros",
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/**
 * Splits the catalog into one group per category, keeping the order in which
 * each category first appears. O(n): a single pass, with a Map giving O(1)
 * lookup of the group an item belongs to.
 */
export function groupByCategory(items: FurnitureInput[]): CategoryGroup[] {
  const groups = new Map<string, FurnitureInput[]>();
  for (const item of items) {
    const group = groups.get(item.category);
    if (group) group.push(item);
    else groups.set(item.category, [item]);
  }
  return Array.from(groups, ([category, groupItems]) => ({ category, items: groupItems }));
}

/** Furniture catalog listing, grouped by category. */
export function CategoryAccordion({ items }: CategoryAccordionProps) {
  const groups = useMemo(() => groupByCategory(items), [items]);

  return (
    <div className="category-accordion">
      {groups.map(({ category, items: groupItems }) => (
        <div key={category} className="accordion-group">
          <div className="accordion-header">
            <span className={`category-tag${isCustomCategory(category) ? " category-tag-custom" : ""}`}>
              {categoryLabel(category)}
            </span>
            <span className="accordion-count">{groupItems.length}</span>
          </div>
          <ul className="catalog-list">
            {groupItems.map((c) => (
              <li key={c.id}>
                <span className="catalog-item-name">{c.name}</span>
                <span className="catalog-item-size">
                  {c.widthCm}×{c.heightCm}×{c.depthCm}cm
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
