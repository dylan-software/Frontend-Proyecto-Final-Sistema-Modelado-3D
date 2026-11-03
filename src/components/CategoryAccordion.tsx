import { useId, useMemo, useState } from "react";

import { es } from "../i18n/es";
import { categoryLabel, groupByCategory } from "../lib/catalog";
import type { AccordionProps } from "../types/catalog";
import { isCustomCategory } from "./ObjectForm";

/**
 * Catálogo de muebles agrupado en categorías plegables. Los títulos de las categorías salen del mapa
 * de i18n/es.ts (las categorías propias se muestran tal cual); el resto de textos, también de allí.
 */
export function CategoryAccordion({ items, onDelete, deletingId = null }: AccordionProps) {
  const t = es.catalog;
  // Texto escrito en el buscador del catálogo.
  const [searchQuery, setSearchQuery] = useState("");
  // Categorías cuyo bloque está abierto; vacío cuando todas están plegadas.
  const [openCategories, setOpenCategories] = useState<ReadonlySet<string>>(() => new Set());
  const idPrefix = useId();
  const query = searchQuery.trim().toLowerCase();

  /**
   * Muebles del catálogo cuyo nombre contiene lo buscado (sin distinguir mayúsculas).
   *
   * Coste: O(n · m) por recálculo (n muebles, m = longitud del nombre para buscar la subcadena).
   * `useMemo` solo recalcula cuando cambian el catálogo o la búsqueda, así que los demás repintados
   * (selección 3D, chat…) cuestan O(1). Una búsqueda vacía devuelve el mismo array sin recorrerlo.
   */
  const filteredItems = useMemo(() => {
    if (!query) return items;
    return items.filter((c) => c.name.toLowerCase().includes(query));
  }, [items, query]);

  const groups = useMemo(() => groupByCategory(filteredItems), [filteredItems]);

  /**
   * Abrir una categoría pliega las demás (acordeón clásico); cerrar una deja el resto como está,
   * así un catálogo todo desplegado se puede ir plegando bloque a bloque.
   */
  function toggleCategory(category: string) {
    setOpenCategories((prev) => {
      if (!prev.has(category)) return new Set([category]);
      const next = new Set(prev);
      next.delete(category);
      return next;
    });
  }

  function expandAll() {
    setOpenCategories(new Set(groups.map((g) => g.category)));
  }

  function collapseAll() {
    setOpenCategories(new Set());
  }

  // Mientras se busca, todos los bloques con coincidencias ya se muestran abiertos.
  const searching = query !== "";
  const allOpen = groups.length > 0 && groups.every((g) => openCategories.has(g.category));

  return (
    <div className="category-accordion">
      <div className="catalog-search-field">
        <input
          type="text"
          className="catalog-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          // Escape vacía el buscador, como el botón de limpiar.
          onKeyDown={(e) => {
            if (e.key === "Escape") setSearchQuery("");
          }}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchLabel}
        />
        {searchQuery !== "" && (
          <button
            type="button"
            className="catalog-search-clear"
            onClick={() => setSearchQuery("")}
            aria-label={t.clearSearch}
            title={t.clearSearch}
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      {groups.length > 1 && (
        <div className="accordion-toolbar">
          <button type="button" onClick={expandAll} disabled={searching || allOpen}>
            {t.expandAll}
          </button>
          <button type="button" onClick={collapseAll} disabled={searching || openCategories.size === 0}>
            {t.collapseAll}
          </button>
        </div>
      )}

      {groups.map(({ category, items: groupItems }, index) => {
        const open = searching || openCategories.has(category);
        // Las categorías propias pueden tener espacios, así que el id usa el índice.
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
            {/* Siempre montado para que la altura se anime; `inert` saca los elementos plegados
                del orden de tabulación y del árbol de accesibilidad. */}
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
                      aria-label={t.deleteItem(c.name)}
                      title={t.delete}
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
        <p className="hint">{t.noMatches(searchQuery.trim())}</p>
      )}
    </div>
  );
}
