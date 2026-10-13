import { useMemo, useState } from "react";

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

/** Furniture catalog listing, grouped into collapsible categories (one open at a time). */
export function CategoryAccordion({ items }: CategoryAccordionProps) {
  const groups = useMemo(() => groupByCategory(items), [items]);
  // Category whose block is expanded; null when all are collapsed.
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  function toggleCategory(category: string) {
    setActiveCategory((prev) => (prev === category ? null : category));
  }

  return (
    <div className="category-accordion">
      {groups.map(({ category, items: groupItems }) => {
        const open = activeCategory === category;
        const panelId = `accordion-panel-${category}`;
        return (
          <div key={category} className="accordion-group">
            <button
              type="button"
              className="accordion-header"
              onClick={() => toggleCategory(category)}
              aria-expanded={open}
              aria-controls={panelId}
            >
              <span className={`category-tag${isCustomCategory(category) ? " category-tag-custom" : ""}`}>
                {categoryLabel(category)}
              </span>
              <span className="accordion-count">{groupItems.length}</span>
              <span className="accordion-chevron" aria-hidden="true">
                ▾
              </span>
            </button>
            {open && (
              <ul id={panelId} className="catalog-list">
                {groupItems.map((c) => (
                  <li key={c.id}>
                    <span className="catalog-item-name">{c.name}</span>
                    <span className="catalog-item-size">
                      {c.widthCm}×{c.heightCm}×{c.depthCm}cm
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
