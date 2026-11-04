import { es } from "../i18n/es";
import type { FurnitureInput } from "../lib/api";
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
        <svg className="manual-drawer-chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M4.5 3 7.5 6 4.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
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
