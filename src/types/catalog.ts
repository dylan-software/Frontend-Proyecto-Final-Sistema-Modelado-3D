import type { FurnitureInput } from "../lib/api";

/** Props of the collapsible catalog (CategoryAccordion). */
export interface AccordionProps {
  /** Every catalog entry; the accordion groups and filters them itself. */
  items: readonly FurnitureInput[];
  /** Asks the parent to delete one catalog entry by id. */
  onDelete?: (id: string) => void;
  /** Id of the entry whose deletion is in flight; its button is disabled meanwhile. */
  deletingId?: string | null;
}

/** Catalog entries sharing one category, in their original order. */
export interface CategoryGroup {
  /** Category as stored in the backend ("bed", "chair", … or a custom name). */
  category: string;
  items: FurnitureInput[];
}
