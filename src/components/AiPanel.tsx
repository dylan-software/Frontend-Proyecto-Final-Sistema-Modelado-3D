import { useId, type ReactNode } from "react";

import { es } from "../i18n/es";
import { IconAssistant, IconChevronLeft } from "./icons";

interface AiPanelProps {
  /** Desplegado (true) o recogido en la barra delgada (false). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El chat (ChatDock), que ocupa casi todo el alto. */
  chat: ReactNode;
  /** Debajo del chat: el buscador de muebles y la sección plegable. */
  children?: ReactNode;
  /** Texto del botón de recoger: "Minimizar" en escritorio, "Cerrar" en la capa del móvil. */
  collapseLabel?: string;
  className?: string;
}

/**
 * Panel izquierdo de la pantalla del proyecto. Recogido, se queda en una barra delgada con el icono
 * del asistente; el contenido NO se desmonta (solo se oculta con `hidden`), así que la conversación,
 * el texto a medio escribir y el formulario se conservan.
 */
export function AiPanel({ open, onOpenChange, chat, children, collapseLabel, className = "" }: AiPanelProps) {
  const t = es.aiPanel;
  const contentId = useId();
  const titleId = useId();

  return (
    <aside className={`ai-panel glass${open ? "" : " ai-panel-collapsed"} ${className}`.trim()} aria-labelledby={titleId}>
      {!open && (
        <button
          type="button"
          className="ai-panel-rail"
          onClick={() => onOpenChange(true)}
          aria-expanded={false}
          aria-controls={contentId}
          aria-label={t.expand}
          title={t.expand}
        >
          <IconAssistant size={22} />
        </button>
      )}

      <div id={contentId} className="ai-panel-content" hidden={!open}>
        <header className="ai-panel-header">
          <span className="ai-panel-icon">
            <IconAssistant />
          </span>
          <h2 id={titleId} className="ai-panel-title">
            {t.title}
          </h2>
          <button
            type="button"
            className="ai-panel-collapse"
            onClick={() => onOpenChange(false)}
            aria-expanded={true}
            aria-controls={contentId}
            aria-label={collapseLabel ?? t.minimize}
            title={collapseLabel ?? t.minimize}
          >
            <IconChevronLeft size={18} />
          </button>
        </header>

        <div className="ai-panel-chat">{chat}</div>
        {children && <div className="ai-panel-extras">{children}</div>}
      </div>
    </aside>
  );
}
