import { es } from "../i18n/es";
import type { FurnitureInput } from "../lib/api";
import { IconChevronRight } from "./icons";
import { ObjectForm } from "./ObjectForm";

interface ManualObjectDrawerProps {
  userId: string;
  onCreated: (item: FurnitureInput) => void;
  /** "Vaciar el catálogo": la confirmación y el borrado los hace ProjectWorkspace, sin cambios. */
  onClearCatalog: () => void;
  clearing: boolean;
  clearDisabled: boolean;
}

/**
 * Sección plegable, cerrada por defecto, con el formulario manual de siempre (ObjectForm) y el botón
 * "Vaciar el catálogo". Usa <details>, así que se abre con teclado sin código propio.
 */
export function ManualObjectDrawer({ userId, onCreated, onClearCatalog, clearing, clearDisabled }: ManualObjectDrawerProps) {
  const t = es.aiPanel;
  return (
    <details className="manual-drawer">
      <summary className="manual-drawer-summary">
        <IconChevronRight className="manual-drawer-chevron" size={16} />
        {t.manualTitle}
      </summary>
      <div className="manual-drawer-body">
        <p className="hint">{t.manualHint}</p>
        <ObjectForm userId={userId} onCreated={onCreated} />
        <button type="button" className="reset-button" onClick={onClearCatalog} disabled={clearDisabled || clearing}>
          {clearing ? es.home.clearing : es.home.clearCatalog}
        </button>
      </div>
    </details>
  );
}
