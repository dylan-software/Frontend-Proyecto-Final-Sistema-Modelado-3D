import { useId, useMemo, useState } from "react";

import { groupByCategory } from "../lib/catalog";
import type { AccordionProps } from "../types/catalog";
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

/** Furniture catalog listing, grouped into collapsible categories. */
export function CategoryAccordion({ items, onDelete, deletingId = null }: AccordionProps) {
  // Text typed in the catalog search box.
  const [searchQuery, setSearchQuery] = useState("");
  // Categories whose block is expanded; empty when all are collapsed.
  const [openCategories, setOpenCategories] = useState<ReadonlySet<string>>(() => new Set());
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

  /**
   * Opening a category collapses the others (classic accordion); closing one
   * leaves the rest as they are, so a fully expanded catalog can be folded
   * back one block at a time.
   */
  function toggleCategory(category: string) {
    setOpenCategories((prev) => {
      if (!prev.has(category)) return new Set([category]);
      const next = new Set(prev);
      next.delete(category);
      return next;
    });
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
        const open = query !== "" || openCategories.has(category);
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
