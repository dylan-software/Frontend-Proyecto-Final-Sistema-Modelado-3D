import { useId, useMemo, useState } from "react";

import type { FurnitureInput } from "../lib/api";
import type { AccordionProps, CategoryGroup } from "../types/catalog";
import { isCustomCategory } from "./ObjectForm";

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
export function groupByCategory(items: readonly FurnitureInput[]): CategoryGroup[] {
  const groups = new Map<string, FurnitureInput[]>();
  for (const item of items) {
    const group = groups.get(item.category);
    if (group) group.push(item);
    else groups.set(item.category, [item]);
  }
  return Array.from(groups, ([category, groupItems]) => ({ category, items: groupItems }));
}

/** Furniture catalog listing, grouped into collapsible categories (one open at a time). */
export function CategoryAccordion({ items, onDelete, deletingId = null }: AccordionProps) {
  // Text typed in the catalog search box.
  const [searchQuery, setSearchQuery] = useState("");
  // Category whose block is expanded; null when all are collapsed.
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const idPrefix = useId();
  const query = searchQuery.trim().toLowerCase();

  /**
   * Catalog entries whose name contains the search query (case-insensitive).
   *
   * Complexity: O(n · m) per recompute — n catalog items, m = name length
   * for the substring check. `useMemo` recomputes only when the catalog or
   * the query change, so unrelated re-renders (3D selection, chat, …) cost
   * O(1). An empty query short-circuits and returns the same array.
   */
  const filteredItems = useMemo(() => {
    if (!query) return items;
    return items.filter((c) => c.name.toLowerCase().includes(query));
  }, [items, query]);

  const groups = useMemo(() => groupByCategory(filteredItems), [filteredItems]);

  function toggleCategory(category: string) {
    setActiveCategory((prev) => (prev === category ? null : category));
  }

  return (
    <div className="category-accordion">
      <input
        type="text"
        className="catalog-search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="🔍 Buscar mueble…"
        aria-label="Buscar en el catálogo"
      />

      {groups.map(({ category, items: groupItems }, index) => {
        // While searching, every category with matches is expanded.
        const open = query !== "" || activeCategory === category;
        // Custom category names may contain spaces, so the id uses the index.
        const panelId = `${idPrefix}-panel-${index}`;
        return (
          <div key={category} className={`accordion-group${open ? " accordion-group-open" : ""}`}>
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
                {open ? "▲" : "▼"}
              </span>
            </button>
            {/* Always mounted so the height can animate; `inert` keeps the
                collapsed items out of the tab order and the accessibility tree. */}
            <div id={panelId} className="accordion-panel" inert={!open}>
              <ul className="catalog-list">
                {groupItems.map((c) => (
                  <li key={c.id}>
                    <span className="catalog-item-name">{c.name}</span>
                    <span className="catalog-item-size">
                      {c.widthCm}×{c.heightCm}×{c.depthCm}cm
                    </span>
                    <button
                      type="button"
                      className="catalog-item-delete"
                      onClick={() => onDelete?.(c.id)}
                      disabled={!onDelete || deletingId === c.id}
                      aria-label={`Eliminar ${c.name}`}
                      title="Eliminar"
                    >
                      <span aria-hidden="true">🗑️</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}

      {items.length > 0 && filteredItems.length === 0 && (
        <p className="hint">Ningún mueble coincide con “{searchQuery.trim()}”.</p>
      )}
    </div>
  );
}
