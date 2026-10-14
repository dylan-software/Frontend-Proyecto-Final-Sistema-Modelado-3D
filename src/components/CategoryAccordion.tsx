import type { FurnitureInput } from "../lib/api";
import { isCustomCategory } from "./ObjectForm";

interface CategoryAccordionProps {
  items: FurnitureInput[];
}

/** Furniture catalog listing. */
export function CategoryAccordion({ items }: CategoryAccordionProps) {
  return (
    <div className="category-accordion">
      <ul className="catalog-list">
        {items.map((c) => (
          <li key={c.id}>
            <span className="catalog-item-name">{c.name}</span>
            <span className={`category-tag${isCustomCategory(c.category) ? " category-tag-custom" : ""}`}>
              {c.category}
            </span>
            <span className="catalog-item-size">
              {c.widthCm}×{c.heightCm}×{c.depthCm}cm
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
